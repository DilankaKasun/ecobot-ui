#!/usr/bin/env python3
"""
Stand-in for the robot's read-only trials server (port 8090), for working on
the dashboard's Evaluation page without a robot.

    python3 scripts/mock_trials_server.py [--port 8090]
    open http://localhost:3001/trials?robot=localhost

Serves the same routes as the robot:

    GET /trials                     {trials: [summary, ...]}, newest first
    GET /components                 {components: {line|turn|...: [row, ...]}}
    GET /export                     builds a zip, returns {export, zip, cost, results}
    GET /exports/<export>/<file>    the zip, results.json, ground_truth.csv
    GET /trials/<trial>/<file>      summary.json, visits.csv, captures.csv,
                                    frames.csv, reports.json, events.csv, path.csv
    GET /trials/<trial>/photos/<jpg>

Every value in a component row is a string, as it would be read back from a
CSV. Data is generated from a fixed seed so it is the same on every start.
Some tests are deliberately short of their target so the checklist shows
both done and not-done steps.

The column names here are the dashboard's assumption of what the robot
writes; if the robot's CSVs differ, change them here and in
src/lib/evaluation.ts together.
"""

import argparse
import csv
import io
import json
import math
import random
import statistics
import time
import zipfile
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:  # photos fall back to a flat grey square
    Image = None

rng = random.Random(42)
HEALTH = ['healthy', 'stressed', 'diseased']
PLANTS = ['tomato', 'pepper', 'chilli', 'eggplant', 'bean']
VIEWPOINTS = ['v01_top', 'v02_upper_foliage', 'v03_mid_foliage', 'v04_lower_stem']


def r(x, nd=3):
    return str(round(x, nd))


def tf(b):
    return 'True' if b else 'False'


# ── component tests ────────────────────────────────────────────────────────

def make_components():
    base = datetime(2026, 10, 18, 9, 0, 0)

    def stamp(i):
        return (base + timedelta(minutes=7 * i)).isoformat(timespec='seconds')

    line = []
    for i in range(6):
        cmd = 2.0
        err = rng.gauss(3.2, 1.4) / 100
        line.append({
            'time': stamp(i), 'commanded_m': r(cmd), 'travelled_m': r(cmd - err),
            'distance_error_cm': r(abs(err) * 100, 2),
            'lateral_drift_cm': r(abs(rng.gauss(4.5, 2.0)), 2),
            'heading_error_deg': r(rng.gauss(1.2, 0.8), 2),
            # One run was bumped mid-test and thrown out.
            'valid': tf(i != 3),
        })

    turn = []
    for i in range(5):
        cmd = 90.0 if i % 2 == 0 else -90.0
        err = rng.gauss(2.1, 1.1)
        turn.append({
            'time': stamp(10 + i), 'commanded_deg': r(cmd, 1),
            'turned_deg': r(cmd + math.copysign(err, cmd), 2),
            'error_deg': r(abs(err), 2), 'valid': 'True',
        })

    square = []
    for i in range(5):
        square.append({
            'time': stamp(20 + i), 'side_m': '1.0',
            'closure_error_cm': r(abs(rng.gauss(9.5, 3.5)), 2),
            'heading_error_deg': r(abs(rng.gauss(4.0, 2.0)), 2),
            'valid': 'True',
        })

    goto = []
    for i in range(10):
        reached = rng.random() > 0.15
        goto.append({
            'time': stamp(30 + i),
            'goal_x': r(rng.uniform(-2, 3), 2), 'goal_y': r(rng.uniform(-2, 2), 2),
            'reached': tf(reached),
            'position_error_cm': r(abs(rng.gauss(11, 4)) if reached else abs(rng.gauss(60, 20)), 2),
            'heading_error_deg': r(abs(rng.gauss(5, 3)), 2),
            'time_s': r(rng.uniform(14, 38), 1),
            'valid': 'True',
        })

    # Seven of ten done: still in progress.
    obstacle = []
    for i in range(7):
        stopped = rng.random() > 0.12
        obstacle.append({
            'time': stamp(45 + i), 'obstacle': rng.choice(['box', 'chair leg', 'person']),
            'approach_speed_mps': r(rng.choice([0.15, 0.2, 0.25]), 2),
            'stopped': tf(stopped),
            'stop_distance_m': r(rng.gauss(0.42, 0.05) if stopped else 0.0, 3),
            'valid': 'True',
        })

    map_rows = []
    for i, true_d in enumerate([1.0, 2.0, 3.0, 4.5, 6.0]):
        measured = true_d * (1 + rng.gauss(0.018, 0.012))
        map_rows.append({
            'time': stamp(60 + i), 'true_distance_m': r(true_d, 2),
            'map_distance_m': r(measured, 3),
            'error_pct': r(abs(measured - true_d) / true_d * 100, 2),
        })

    tp, fp, fn = 182, 14, 21
    p, rc = tp / (tp + fp), tp / (tp + fn)
    yolo = [{
        'time': stamp(70), 'images': '120', 'true_positives': str(tp),
        'false_positives': str(fp), 'false_negatives': str(fn),
        'precision': r(p, 4), 'recall': r(rc, 4), 'f1': r(2 * p * rc / (p + rc), 4),
        'mean_iou': r(0.78, 3),
    }]

    # Three of five plants done.
    llm = []
    for i in range(3):
        repeats = 5
        agreeing = rng.choice([4, 5, 5])
        llm.append({
            'time': stamp(80 + i), 'plant': f'{PLANTS[i]}_{i + 1}',
            'repeats': str(repeats), 'agreeing': str(agreeing),
            'agreement_pct': r(agreeing / repeats * 100, 1),
            'majority_health': rng.choice(HEALTH),
        })

    return {'line': line, 'turn': turn, 'square': square, 'goto': goto,
            'obstacle': obstacle, 'map': map_rows, 'yolo': yolo, 'llm': llm}


# ── plant-run trials ───────────────────────────────────────────────────────

def make_trials():
    trials = {}
    start = datetime(2026, 10, 19, 10, 0, 0)
    # Eight of ten plant runs done.
    for t in range(8):
        tid = (start + timedelta(hours=3 * t)).strftime('trial_%Y%m%d_%H%M%S')
        n_plants = rng.randint(3, 5)
        visits, captures, reports, frames, events, path = [], [], [], [], [], []
        clock = 0.0
        x = y = yaw = 0.0
        photo_names = []
        for p in range(n_plants):
            plant = f'{PLANTS[p % len(PLANTS)]}_{p + 1}'
            reached = rng.random() > 0.12
            reach_s = rng.uniform(25, 70)
            clock += reach_s
            for k in range(8):
                x += math.cos(yaw) * 0.25
                y += math.sin(yaw) * 0.25
                yaw += rng.uniform(-0.3, 0.3)
                path.append({'t_s': r(clock - reach_s + k * reach_s / 8, 1),
                             'x': r(x), 'y': r(y), 'yaw': r(yaw)})
            events.append({'t_s': r(clock, 1), 'event': 'reached' if reached else 'gave_up',
                           'detail': plant})
            truth = rng.choice(HEALTH)
            gemini = truth if rng.random() > 0.2 else rng.choice(HEALTH)
            # The last two trials have not been labelled yet.
            known = t < 6 and reached
            n_photos = len(VIEWPOINTS) if reached else 0
            visits.append({
                'plant': plant, 'reached': tf(reached),
                'time_to_reach_s': r(reach_s, 1),
                'parking_error_cm': r(abs(rng.gauss(6.5, 2.5)), 2) if reached else '',
                'parking_heading_error_deg': r(abs(rng.gauss(4, 2)), 2) if reached else '',
                'photos': str(n_photos),
                'gemini_health': gemini if reached else '',
                'gemini_confidence': r(rng.uniform(0.6, 0.97), 2) if reached else '',
                'true_health': truth if known else '',
            })
            if not reached:
                continue
            shots = []
            for v in VIEWPOINTS:
                name = f'{plant}_{v}.jpg'
                sharp = rng.gauss(260, 70)
                captures.append({'plant': plant, 'viewpoint': v, 'photo': name,
                                 'sharpness': r(max(sharp, 30), 1),
                                 'brightness': r(rng.uniform(90, 170), 1),
                                 'sharp': tf(sharp > 150)})
                shots.append(name)
                photo_names.append(name)
            reports.append({
                'plant': plant, 'health': gemini, 'confidence': float(visits[-1]['gemini_confidence']),
                'notes': {
                    'healthy': 'Leaves are uniformly green with no visible lesions.',
                    'stressed': 'Slight yellowing at leaf margins; likely water stress.',
                    'diseased': 'Brown concentric spots on lower leaves, consistent with early blight.',
                }[gemini],
                'issues': [] if gemini == 'healthy' else ['leaf discolouration'],
                'photos': shots,
            })
            clock += 30
        for i in range(int(clock)):
            frames.append({'t_s': str(i), 'detections': str(rng.randint(0, 3)),
                           'fps': r(rng.uniform(13, 16), 1)})
        done = [v for v in visits if v['reached'] == 'True']
        trials[tid] = {
            'summary': {
                'trial': tid,
                'started': (start + timedelta(hours=3 * t)).isoformat(timespec='seconds'),
                'duration_s': round(clock, 1),
                'plants_scanned': len(done),
                'plants_not_reached': len(visits) - len(done),
                'distance_driven_m': round(len(path) * 0.25, 2),
                'avoidance_interventions': rng.randint(0, 4),
                'photos': len(captures), 'reports': len(reports), 'frames': len(frames),
            },
            'visits': visits, 'captures': captures, 'reports': reports,
            'frames': frames, 'events': events, 'path': path,
            'photo_names': photo_names,
        }
    return trials


COMPONENTS = make_components()
TRIALS = make_trials()
EXPORTS = {}


# ── results, as the robot's /export works them out ─────────────────────────

def stat(values):
    values = [v for v in values if v is not None]
    if not values:
        return None
    return {'mean': round(statistics.mean(values), 4),
            'std': round(statistics.stdev(values), 4) if len(values) > 1 else 0.0,
            'n': len(values)}


def rate(flags):
    flags = list(flags)
    if not flags:
        return None
    return {'mean': round(100 * sum(flags) / len(flags), 2), 'std': None, 'n': len(flags)}


def num(row, key):
    try:
        return float(row[key])
    except (KeyError, ValueError, TypeError):
        return None


def compute_results():
    c = {k: [row for row in rows if row.get('valid', 'True') == 'True']
         for k, rows in COMPONENTS.items()}
    visits = [v for t in TRIALS.values() for v in t['visits']]
    reached = [v for v in visits if v['reached'] == 'True']
    labelled = [v for v in reached if v['true_health']]
    captures = [cap for t in TRIALS.values() for cap in t['captures']]
    y = COMPONENTS['yolo'][-1]
    return {
        'line': {'distance_error_cm': stat(num(x, 'distance_error_cm') for x in c['line']),
                 'lateral_drift_cm': stat(num(x, 'lateral_drift_cm') for x in c['line'])},
        'turn': {'error_deg': stat(num(x, 'error_deg') for x in c['turn'])},
        'square': {'closure_error_cm': stat(num(x, 'closure_error_cm') for x in c['square'])},
        'goto': {'success_pct': rate(x['reached'] == 'True' for x in c['goto']),
                 'position_error_cm': stat(num(x, 'position_error_cm')
                                           for x in c['goto'] if x['reached'] == 'True')},
        'obstacle': {'stop_pct': rate(x['stopped'] == 'True' for x in c['obstacle']),
                     'stop_distance_m': stat(num(x, 'stop_distance_m')
                                             for x in c['obstacle'] if x['stopped'] == 'True')},
        'map': {'error_pct': stat(num(x, 'error_pct') for x in c['map'])},
        'yolo': {'precision': {'mean': float(y['precision']), 'std': None, 'n': 1},
                 'recall': {'mean': float(y['recall']), 'std': None, 'n': 1},
                 'f1': {'mean': float(y['f1']), 'std': None, 'n': 1}},
        'llm': {'agreement_pct': stat(num(x, 'agreement_pct') for x in c['llm'])},
        'camera': {'sharpness': stat(num(x, 'sharpness') for x in captures),
                   'sharp_pct': rate(x['sharp'] == 'True' for x in captures)},
        'parking': {'parking_error_cm': stat(num(v, 'parking_error_cm') for v in reached),
                    'time_to_reach_s': stat(num(v, 'time_to_reach_s') for v in reached),
                    'reach_pct': rate(v['reached'] == 'True' for v in visits)},
        'diagnosis': {'accuracy_pct': rate(v['gemini_health'] == v['true_health'] for v in labelled)},
    }


def to_csv(rows):
    if not rows:
        return ''
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue()


def ground_truth_csv():
    rows = []
    for tid, t in TRIALS.items():
        for v in t['visits']:
            if v['reached'] != 'True':
                continue
            rows.append({'trial': tid, 'plant': v['plant'],
                         'gemini_health': v['gemini_health'], 'true_health': v['true_health']})
    return to_csv(rows)


def photo_bytes(name):
    if Image is None:
        return bytes.fromhex(
            'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c'
            '140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27'
            '393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000'
            '000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300'
            '041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a'
            '25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475'
            '767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9ba'
            'c2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda'
            '0008010100003f00fbd3ffd9')
    seed = sum(map(ord, name))
    g = random.Random(seed)
    img = Image.new('RGB', (480, 360), (40 + g.randint(0, 30), 70 + g.randint(0, 40), 35))
    d = ImageDraw.Draw(img)
    for _ in range(14):
        cx, cy, rr = g.randint(0, 480), g.randint(0, 360), g.randint(30, 90)
        d.ellipse([cx - rr, cy - rr // 2, cx + rr, cy + rr // 2],
                  fill=(50 + g.randint(0, 60), 120 + g.randint(0, 80), 40 + g.randint(0, 30)))
    if 'diseased' in name or g.random() < 0.3:
        for _ in range(6):
            cx, cy = g.randint(0, 480), g.randint(0, 360)
            d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(110, 70, 30))
    d.text((10, 10), name, fill=(255, 255, 255))
    if g.random() < 0.25:  # some shots are soft, matching sharpness in captures.csv
        img = img.filter(ImageFilter.GaussianBlur(3))
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=80)
    return buf.getvalue()


def build_export():
    t0 = time.time()
    eid = datetime.now().strftime('export_%Y%m%d_%H%M%S')
    results = compute_results()
    files = {'results.json': json.dumps(results, indent=2).encode(),
             'ground_truth.csv': ground_truth_csv().encode()}
    for name, rows in COMPONENTS.items():
        files[f'components/{name}.csv'] = to_csv(rows).encode()
    for tid, t in TRIALS.items():
        files[f'trials/{tid}/summary.json'] = json.dumps(t['summary'], indent=2).encode()
        files[f'trials/{tid}/reports.json'] = json.dumps(t['reports'], indent=2).encode()
        for key in ('visits', 'captures', 'frames', 'events', 'path'):
            files[f'trials/{tid}/{key}.csv'] = to_csv(t[key]).encode()
        for p in t['photo_names']:
            files[f'trials/{tid}/photos/{p}'] = photo_bytes(p)
    collected = time.time() - t0
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in files.items():
            z.writestr(name, data)
    total = time.time() - t0
    zip_bytes = buf.getvalue()
    zip_name = f'{eid}.zip'
    EXPORTS[eid] = {zip_name: zip_bytes, 'results.json': files['results.json'],
                    'ground_truth.csv': files['ground_truth.csv']}
    mb = sum(len(v) for v in files.values()) / 1e6
    return {
        'export': eid, 'zip': zip_name,
        'cost': {'trials': len(TRIALS), 'files': len(files), 'megabytes': round(mb, 3),
                 'seconds': round(collected, 3), 'seconds_including_zip': round(total, 3),
                 'zip_megabytes': round(len(zip_bytes) / 1e6, 3)},
        'results': results,
    }


CONTENT_TYPES = {'.json': 'application/json', '.csv': 'text/csv', '.zip': 'application/zip',
                 '.jpg': 'image/jpeg'}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype='application/json', download=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        # The dashboard is on another port, so it needs CORS to read JSON.
        self.send_header('Access-Control-Allow-Origin', '*')
        if download:
            self.send_header('Content-Disposition', f'attachment; filename="{download}"')
        self.end_headers()
        self.wfile.write(body)

    def _file(self, name, data):
        ext = name[name.rfind('.'):]
        ctype = CONTENT_TYPES.get(ext, 'application/octet-stream')
        if isinstance(data, (list, dict)) and ext == '.csv':
            data = to_csv(data)
        dl = name if ext in ('.zip', '.csv') else None
        self._send(200, data, ctype, dl)

    def do_GET(self):
        parts = [unquote(p) for p in urlparse(self.path).path.strip('/').split('/') if p]
        if parts == ['trials']:
            summaries = sorted((t['summary'] for t in TRIALS.values()),
                               key=lambda s: s['started'], reverse=True)
            return self._send(200, {'trials': summaries})
        if parts == ['components']:
            return self._send(200, {'components': COMPONENTS})
        if parts == ['export']:
            time.sleep(0.6)  # the real one walks the disk; make the button visibly busy
            return self._send(200, build_export())
        if len(parts) == 3 and parts[0] == 'exports':
            f = EXPORTS.get(parts[1], {}).get(parts[2])
            if f is None:
                return self._send(404, {'error': 'no such export file'})
            return self._file(parts[2], f)
        if len(parts) >= 3 and parts[0] == 'trials' and parts[1] in TRIALS:
            t = TRIALS[parts[1]]
            if len(parts) == 4 and parts[2] == 'photos' and parts[3] in t['photo_names']:
                return self._send(200, photo_bytes(parts[3]), 'image/jpeg')
            name = parts[2]
            if name == 'summary.json':
                return self._file(name, json.dumps(t['summary']))
            if name == 'reports.json':
                return self._file(name, json.dumps(t['reports']))
            key = name[:-4] if name.endswith('.csv') else None
            if key in ('visits', 'captures', 'frames', 'events', 'path'):
                return self._file(name, t[key])
        self._send(404, {'error': 'not found'})

    def log_message(self, fmt, *args):
        print('[mock-trials] ' + fmt % args)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--port', type=int, default=8090)
    args = ap.parse_args()
    print(f'[mock-trials] {len(TRIALS)} trials, serving on http://0.0.0.0:{args.port}')
    ThreadingHTTPServer(('0.0.0.0', args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
