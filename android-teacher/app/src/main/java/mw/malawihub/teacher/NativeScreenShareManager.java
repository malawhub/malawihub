package mw.malawihub.teacher;

import android.app.Activity;
import android.content.Intent;
import android.os.Handler;
import org.json.JSONObject;
import org.webrtc.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class NativeScreenShareManager {
    public interface SignalBridge { void send(JSONObject payload); void status(String text); }
    private final Activity activity;
    private final SignalBridge bridge;
    private PeerConnectionFactory factory;
    private EglBase eglBase;
    private VideoCapturer capturer;
    private VideoSource source;
    private VideoTrack screenTrack;
    private final Map<String,PeerConnection> peers=new ConcurrentHashMap<>();
    private final Map<String,List<IceCandidate>> pendingIce=new ConcurrentHashMap<>();
    private String code="", fromId="native-screen";
    private boolean active=false;

    public NativeScreenShareManager(Activity activity, SignalBridge bridge){this.activity=activity;this.bridge=bridge;}

    public void start(Intent projectionData,String roomCode,String nativeId){
        if(active)return;
        code=roomCode==null?"":roomCode; fromId=nativeId==null?"native-screen":nativeId;
        PeerConnectionFactory.initialize(PeerConnectionFactory.builder(activity).createInitializationOptions());
        factory=PeerConnectionFactory.builder()
            .setVideoEncoderFactory(new DefaultVideoEncoderFactory(EglBase.create().getEglBaseContext(),true,true))
            .setVideoDecoderFactory(new DefaultVideoDecoderFactory(EglBase.create().getEglBaseContext()))
            .createPeerConnectionFactory();
        eglBase=EglBase.create();
        capturer=new ScreenCapturerAndroid(projectionData,new android.media.projection.MediaProjection.Callback(){
            @Override public void onStop(){stop();bridge.status("Screen sharing stopped by Android.");}
        });
        source=factory.createVideoSource(capturer.isScreencast());
        SurfaceTextureHelper helper=SurfaceTextureHelper.create("MalawiHubScreenCapture",eglBase.getEglBaseContext());
        capturer.initialize(helper,activity.getApplicationContext(),source.getCapturerObserver());
        capturer.startCapture(1280,720,15);
        screenTrack=factory.createVideoTrack("malawihub-screen",source);
        active=true;
        bridge.status("Screen sharing is active.");
    }

    public boolean isActive(){return active;}

    public void studentJoined(String id){
        if(!active||id==null||id.isEmpty())return;
        try{
            if(peers.containsKey(id))return;
            PeerConnection.RTCConfiguration cfg=new PeerConnection.RTCConfiguration(Arrays.asList(
                PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
                PeerConnection.IceServer.builder("stun:stun.cloudflare.com:3478").createIceServer()
            ));
            PeerConnection pc=factory.createPeerConnection(cfg,new PeerConnection.Observer(){
                public void onIceCandidate(IceCandidate c){try{JSONObject p=new JSONObject();p.put("type","native-screen-ice");p.put("to",id);p.put("from",fromId);p.put("candidate",new JSONObject().put("sdpMid",c.sdpMid).put("sdpMLineIndex",c.sdpMLineIndex).put("candidate",c.sdp));bridge.send(p);}catch(Exception ignored){}}
                public void onSignalingChange(PeerConnection.SignalingState s){} public void onIceConnectionChange(PeerConnection.IceConnectionState s){}
                public void onIceConnectionReceivingChange(boolean b){} public void onIceGatheringChange(PeerConnection.IceGatheringState s){}
                public void onIceCandidatesRemoved(IceCandidate[] c){} public void onAddStream(MediaStream s){} public void onRemoveStream(MediaStream s){}
                public void onDataChannel(DataChannel d){} public void onRenegotiationNeeded(){}
                public void onAddTrack(RtpReceiver r,MediaStream[] s){}
                public void onConnectionChange(PeerConnection.PeerConnectionState s){}
                public void onSelectedCandidatePairChanged(CandidatePairChangeEvent e){}
            });
            if(pc==null)return;
            peers.put(id,pc);
            pc.addTrack(screenTrack);
            pc.createOffer(new SdpObserver(){
                public void onCreateSuccess(SessionDescription d){pc.setLocalDescription(this,d);try{JSONObject sdp=new JSONObject();sdp.put("type","offer");sdp.put("sdp",d.description);JSONObject p=new JSONObject();p.put("type","native-screen-offer");p.put("to",id);p.put("from",fromId);p.put("sdp",sdp);bridge.send(p);}catch(Exception ignored){}}
                public void onSetSuccess(){} public void onCreateFailure(String s){bridge.status("Screen share connection failed.");} public void onSetFailure(String s){}
            },new MediaConstraints());
        }catch(Exception e){bridge.status("Screen sharing connection failed.");}
    }

    public void signal(JSONObject p){
        try{
            String type=p.optString("type"),id=p.optString("from");
            if("native-screen-answer".equals(type)){
                PeerConnection pc=peers.get(id);if(pc==null)return;
                JSONObject s=p.getJSONObject("sdp");
                pc.setRemoteDescription(new SdpObserver(){
                    public void onSetSuccess(){List<IceCandidate> q=pendingIce.remove(id);if(q!=null)for(IceCandidate x:q)pc.addIceCandidate(x);}
                    public void onSetFailure(String s){}
                    public void onCreateSuccess(SessionDescription d){}
                    public void onCreateFailure(String s){}
                },new SessionDescription(SessionDescription.Type.ANSWER,s.getString("sdp")));
            }else if("native-screen-ice".equals(type)){
                PeerConnection pc=peers.get(id);if(pc==null)return;
                JSONObject c=p.getJSONObject("candidate");
                IceCandidate candidate=new IceCandidate(c.optString("sdpMid"),c.optInt("sdpMLineIndex"),c.optString("candidate"));
                if(pc.getRemoteDescription()!=null)pc.addIceCandidate(candidate);else{List<IceCandidate> q=pendingIce.get(id);if(q==null){q=new ArrayList<>();pendingIce.put(id,q);}q.add(candidate);}
            }
        }catch(Exception ignored){}
    }

    public void stop(){
        if(!active)return;
        active=false;
        for(PeerConnection pc:peers.values())pc.close();
        peers.clear();
        try{if(capturer!=null)capturer.stopCapture();}catch(Exception ignored){}
        if(capturer!=null)capturer.dispose();capturer=null;
        if(screenTrack!=null)screenTrack.dispose();screenTrack=null;
        if(source!=null)source.dispose();source=null;
        if(factory!=null)factory.dispose();factory=null;
        if(eglBase!=null)eglBase.release();eglBase=null;
        try{JSONObject p=new JSONObject();p.put("type","native-screen-end");p.put("from",fromId);p.put("code",code);bridge.send(p);}catch(Exception ignored){}
    }
}