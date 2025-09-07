import { useEffect, useRef, useState } from 'react'
import './App.css'
import { Madoi, type EnterRoomAllowedListenerOrObject, type PeerEnteredListenerOrObject, type PeerLeavedListenerOrObject } from 'madoi-client';
import { RemoteVideo } from './RemoteVideo';
import { RtcPeer, type SendSignalNeededListenerOrObject } from './RtcPeer';

interface Props{
  madoi: Madoi;
}
export default function App({madoi}: Props) {
  const [rtcPeers, setRtcPeers] = useState<RtcPeer[]>([]);
  const [mediaStreams, setMediaStreams] = useState<MediaStream[]>([]);
	const localVideoRef = useRef<HTMLVideoElement>(null!);

  // ピアを作成するメソッド
  const newRtcPeer = (peerId: string, polite: boolean)=>{
    const ret = new RtcPeer(peerId, polite);
    ret.addEventListener("sendSignalNeeded", onSendSignalNeeded);
    mediaStreams.forEach(s=>ret.addStream(s));
    return ret;
  };
  // ピアの配列から指定のピアを探すメソッド
  const getRtcPeer = (peerId: string)=>{
    const ret = rtcPeers.find(p=>p.id===peerId);
    if(!ret) throw new Error(`peer not found. ${peerId}`);
    return ret;
  };

  // Madoiのセッション管理メッセージのリスナ
  const onEnterRoomAllowed: EnterRoomAllowedListenerOrObject = ({detail: {otherPeers}})=>{
    console.log("[App.onEnterRoomAllowed]", otherPeers);
    setRtcPeers(otherPeers.map(p=>{
      console.log("new peer", p.id);
      const rtcPeer = newRtcPeer(p.id, true);
      rtcPeer.startOffer();
      return rtcPeer;
    }));
  };
  const onPeerEntered: PeerEnteredListenerOrObject = ({detail: {peer}})=>{
    console.log("[App.onPeerEntered]", peer.id);
    const rtcPeer = newRtcPeer(peer.id, false);
    setRtcPeers(rtcPeers=>[...rtcPeers, rtcPeer]);
  };
  const onPeerLeaved: PeerLeavedListenerOrObject = ({detail: {peerId}})=>{
    console.log("[App.onPeerLeaved]", peerId);
    setRtcPeers(rtcPeers=>rtcPeers.filter(p=>p.id!==peerId));
  };
  // Madoiのアプリケーションメッセージのリスナ
  const onWebRtcSignalReceived: (event: {detail: {sender?: string, content: RTCSessionDescriptionInit | RTCIceCandidate | null}})=>void = async ({detail: {sender, content}})=>{
    console.log("[App.onWebRtcSignalReceived]", sender, content?.type);
    getRtcPeer(sender!).receiveSignal(content);
  };
  // RtcPeerイベントのリスナ
  const onSendSignalNeeded: SendSignalNeededListenerOrObject = ({detail: {peerId, content}})=>{
    console.log("[App.onSendSignalNeeded] send signal", content?.type);
    madoi.unicast("webRtcSignal", content, peerId);
  };
  // start/stopボタンのクリックイベントのリスナ
  const onStartMediaStreamClick = async ()=>{
    if(mediaStreams.length == 0){
      const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play();
      rtcPeers.forEach(p=>p.addStream(stream));
      setMediaStreams([stream]);
    } else{
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(t=>t.stop());
      localVideoRef.current.srcObject = null;
      rtcPeers.forEach(p=>p.clearStream());
      setMediaStreams([]);
    }
  };

  useEffect(()=>{
    // madoiイベントの付け外し
    madoi.addEventListener("enterRoomAllowed", onEnterRoomAllowed);
    madoi.addEventListener("peerEntered", onPeerEntered);
    madoi.addEventListener("peerLeaved", onPeerLeaved);
    madoi.addReceiver("webRtcSignal", onWebRtcSignalReceived);
    return ()=>{
      madoi.removeEventListener("enterRoomAllowed", onEnterRoomAllowed);
      madoi.removeEventListener("peerEntered", onPeerEntered);
      madoi.removeEventListener("peerLeaved", onPeerLeaved);
      madoi.removeReceiver("webRtcSignal", onWebRtcSignalReceived);
    };
  });

  return <>
    <div style={{border: "solid 1px", padding: "2px"}}>
      <video ref={localVideoRef} playsInline autoPlay muted width={160} height={120}></video>
      <br/>
      Local({madoi.getSelfPeerId().split("-")[0]})
      <button onClick={onStartMediaStreamClick}>{mediaStreams.length == 0 ? "start" : "stop"}</button>
    </div>
    {rtcPeers.map(p=>
      <RemoteVideo key={p.id} peer={p} />
    )}
  </>;
}
