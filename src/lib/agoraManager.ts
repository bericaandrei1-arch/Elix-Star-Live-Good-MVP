
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack, 
  UID 
} from 'agora-rtc-sdk-ng';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

export class AgoraManager {
  private static instance: AgoraManager;
  private client: IAgoraRTCClient;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private joined = false;
  private uid: UID | null = null;

  private constructor() {
    this.client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    
    // Handle remote users
    this.client.on('user-published', async (user, mediaType) => {
      await this.client.subscribe(user, mediaType);
      if (mediaType === 'video') {
        console.log('Subscribe to remote video:', user.uid);
        // Dispatch event or callback to UI to play video
        window.dispatchEvent(new CustomEvent('agora-user-published', { detail: { user, mediaType } }));
      }
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    });

    this.client.on('user-unpublished', (user, mediaType) => {
        window.dispatchEvent(new CustomEvent('agora-user-unpublished', { detail: { user, mediaType } }));
    });
  }

  public static getInstance(): AgoraManager {
    if (!AgoraManager.instance) {
      AgoraManager.instance = new AgoraManager();
    }
    return AgoraManager.instance;
  }

  public async joinChannel(channel: string, token: string | null, uid: UID | null): Promise<UID> {
    if (!APP_ID) {
      throw new Error('Agora App ID is missing. Please set VITE_AGORA_APP_ID in your .env file.');
    }
    if (this.joined) return this.uid!;

    try {
      this.client.setClientRole('host'); // Default to host for now, or 'audience'
      this.uid = await this.client.join(APP_ID, channel, token, uid);
      this.joined = true;
      
      // Create local tracks if not created
      if (!this.localAudioTrack || !this.localVideoTrack) {
        [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      }
      
      // Publish
      await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
      
      return this.uid;
    } catch (error) {
      console.error('Agora join failed:', error);
      throw error;
    }
  }

  public async leaveChannel(): Promise<void> {
    if (!this.joined) return;
    
    this.localAudioTrack?.close();
    this.localVideoTrack?.close();
    this.localAudioTrack = null;
    this.localVideoTrack = null;

    await this.client.leave();
    this.joined = false;
    this.uid = null;
  }

  public getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  public async switchCamera() {
    if (this.localVideoTrack) {
        // Agora doesn't support 'facingMode' toggle directly on the track easily without recreating, 
        // but typically you get devices and switch. 
        // For mobile web, typically we just recreate the track or use setDevice.
        // Simplified for MVP:
        const devices = await AgoraRTC.getCameras();
        const currentLabel = this.localVideoTrack.getTrackLabel();
        const nextDevice = devices.find(d => d.label !== currentLabel);
        if (nextDevice) {
            await this.localVideoTrack.setDevice(nextDevice.deviceId);
        }
    }
  }
}
