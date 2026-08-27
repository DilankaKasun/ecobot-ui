#!/usr/bin/env python3
"""
EcoBot ROS 2 <-> LiveKit WebRTC Bridge
--------------------------------------
This node connects ROS 2 to LiveKit Cloud (or self-hosted LiveKit server).
It publishes camera feeds (RealSense D415 & Manipulator Wrist Cam) as WebRTC VideoTracks
and bridges teleoperation commands (/cmd_vel) over WebRTC DataChannel with <100ms latency.

Requirements on Jetson / Robot:
  pip install livekit livekit-api opencv-python cv-bridge

Usage:
  export LIVEKIT_URL="wss://your-project.livekit.cloud"
  export LIVEKIT_API_KEY="APIxxxx"
  export LIVEKIT_API_SECRET="secretxxxx"
  export LIVEKIT_ROOM="ecobot-teleop"
  python3 ros2_livekit_bridge.py
"""

import asyncio
import os
import json
import numpy as np
import cv2

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CompressedImage
from geometry_msgs.msg import Twist
from cv_bridge import CvBridge

from livekit import rtc, api

class Ros2LiveKitBridge(Node):
    def __init__(self, room: rtc.Room):
        super().__init__('ros2_livekit_bridge')
        self.room = room
        self.bridge = CvBridge()

        # Video Track Sources
        self.main_video_source = rtc.VideoSource(640, 480)
        self.wrist_video_source = rtc.VideoSource(640, 480)

        # ROS 2 Subscriptions (Images)
        self.sub_realsense = self.create_subscription(
            Image,
            '/camera/color/image_raw',
            self.on_realsense_frame,
            10
        )
        self.sub_wrist = self.create_subscription(
            Image,
            '/arm/camera/image_raw',
            self.on_wrist_frame,
            10
        )

        # ROS 2 Publisher (Teleop /cmd_vel from LiveKit DataChannel)
        self.pub_cmd_vel = self.create_publisher(Twist, '/cmd_vel', 10)

        # Setup LiveKit data listener
        @self.room.on("data_received")
        def on_data_received(data_packet: rtc.DataPacket):
            try:
                msg_str = data_packet.data.decode('utf-8')
                payload = json.loads(msg_str)
                if 'linear' in payload and 'angular' in payload:
                    twist = Twist()
                    twist.linear.x = float(payload['linear'].get('x', 0.0))
                    twist.linear.y = float(payload['linear'].get('y', 0.0))
                    twist.linear.z = float(payload['linear'].get('z', 0.0))
                    twist.angular.x = float(payload['angular'].get('x', 0.0))
                    twist.angular.y = float(payload['angular'].get('y', 0.0))
                    twist.angular.z = float(payload['angular'].get('z', 0.0))
                    self.pub_cmd_vel.publish(twist)
            except Exception as e:
                self.get_logger().warn(f"Failed to parse LiveKit data packet: {e}")

        self.get_logger().info("ROS 2 LiveKit Bridge initialized successfully.")

    def on_realsense_frame(self, msg: Image):
        try:
            cv_img = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            # Convert BGR to RGBA for LiveKit VideoFrame
            rgba = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGBA)
            h, w, _ = rgba.shape
            frame = rtc.VideoFrame(w, h, rtc.VideoBufferType.RGBA, rgba.tobytes())
            self.main_video_source.capture_frame(frame)
        except Exception as e:
            self.get_logger().warn(f"Error processing RealSense frame: {e}")

    def on_wrist_frame(self, msg: Image):
        try:
            cv_img = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            rgba = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGBA)
            h, w, _ = rgba.shape
            frame = rtc.VideoFrame(w, h, rtc.VideoBufferType.RGBA, rgba.tobytes())
            self.wrist_video_source.capture_frame(frame)
        except Exception as e:
            self.get_logger().warn(f"Error processing Wrist frame: {e}")


async def main():
    livekit_url = os.getenv('LIVEKIT_URL', 'wss://govimithuru-agent-c8j0bu7s.livekit.cloud')
    api_key = os.getenv('LIVEKIT_API_KEY', 'APIW7euwjUS6BfT')
    api_secret = os.getenv('LIVEKIT_API_SECRET', '4iVWHe1gYXnOiF1t8QBCn4EelUxusl3j2gcAUWKQlyJ')
    room_name = os.getenv('LIVEKIT_ROOM', 'ecobot-control')

    # Generate token for robot publisher
    token = api.AccessToken(api_key, api_secret) \
        .with_identity("ecobot-jetson") \
        .with_name("EcoBot Robot") \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True
        )).to_jwt()

    room = rtc.Room()
    print(f"Connecting to LiveKit Room '{room_name}' at {livekit_url}...")
    await room.connect(livekit_url, token)
    print("Connected to LiveKit Room!")

    # Initialize ROS 2
    rclpy.init()
    node = Ros2LiveKitBridge(room)

    # Publish RealSense Track
    main_track = rtc.LocalVideoTrack.create_video_track("realsense_camera", node.main_video_source)
    await room.local_participant.publish_track(main_track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_CAMERA))
    print("Published 'realsense_camera' WebRTC VideoTrack")

    # Publish Wrist Track
    wrist_track = rtc.LocalVideoTrack.create_video_track("wrist_camera", node.wrist_video_source)
    await room.local_participant.publish_track(wrist_track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_SCREENSHARE))
    print("Published 'wrist_camera' WebRTC VideoTrack")

    # Async ROS 2 spin loop
    try:
        while rclpy.ok():
            rclpy.spin_once(node, timeout_sec=0.01)
            await asyncio.sleep(0.005)
    except KeyboardInterrupt:
        pass
    finally:
        await room.disconnect()
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    asyncio.run(main())
