import { useRef, useEffect, useState } from "react";
import { useCallStore } from "../Store/useCallStore";
import { useAuthStore } from "../Store/useAuthStore";
import { PhoneOff, Phone, Mic, MicOff, Video, VideoOff } from "lucide-react";

const VideoPlayer = () => {
    const {
        callAccepted,
        callEnded,
        stream,
        remoteStream,
        call,
        leaveCall,
        answerCall,
        isCalling,
        isRinging,
        isOtherUserRinging,
        isSwapped,
        toggleSwap
    } = useCallStore();

    const myVideoRef = useRef();
    const userVideoRef = useRef();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    useEffect(() => {
        if (stream && myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
        }
    }, [stream, isCalling, isRinging, callAccepted, isSwapped]);

    useEffect(() => {
        if (remoteStream && userVideoRef.current) {
            userVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, callAccepted, isSwapped]);

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
            setIsVideoOff(!isVideoOff);
        }
    };

    // 1. Ringing Screen (Incoming)
    if (isRinging && !callAccepted) {
        return (
            <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-zinc-900 text-white">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-black/80" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-8">
                        <div className="absolute -inset-4 bg-indigo-500 rounded-full blur-2xl animate-pulse" />
                        <div className="size-32 bg-indigo-600 rounded-full flex items-center justify-center text-5xl font-bold shadow-2xl relative">
                            {call.name?.[0] || "?"}
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold mb-2">{call.name || "Unknown"}</h2>
                    <p className="text-indigo-300 animate-bounce">Ringing...</p>

                    <div className="mt-16 flex gap-12">
                        <button
                            onClick={leaveCall}
                            className="group flex flex-col items-center gap-3"
                        >
                            <div className="size-16 bg-red-500 rounded-full flex items-center justify-center group-hover:bg-red-600 transition-all transform group-hover:scale-110">
                                <PhoneOff className="size-8" />
                            </div>
                            <span className="text-sm font-medium">Decline</span>
                        </button>

                        <button
                            onClick={answerCall}
                            className="group flex flex-col items-center gap-3"
                        >
                            <div className="size-16 bg-green-500 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-all transform group-hover:scale-110 animate-bounce">
                                <Phone className="size-8" />
                            </div>
                            <span className="text-sm font-medium">Answer</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Calling Screen (Outgoing)
    if (isCalling && !callAccepted) {
        return (
            <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-zinc-900 text-white">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-black/80" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="size-32 bg-zinc-700 rounded-full flex items-center justify-center text-5xl font-bold mb-8 shadow-2xl">
                        {call.name?.[0] || "?"}
                    </div>

                    <h2 className="text-3xl font-bold mb-2">
                        {isOtherUserRinging ? `Ringing ${call.name || "User"}...` : `Calling ${call.name || "User"}...`}
                    </h2>
                    <div className="flex gap-2 mb-16">
                        <div className="size-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="size-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="size-2 bg-indigo-500 rounded-full animate-bounce" />
                    </div>

                    <button
                        onClick={leaveCall}
                        className="group flex flex-col items-center gap-3"
                    >
                        <div className="size-16 bg-red-500 rounded-full flex items-center justify-center group-hover:bg-red-600 transition-all transform group-hover:scale-110">
                            <PhoneOff className="size-8" />
                        </div>
                        <span className="text-sm font-medium">End Call</span>
                    </button>
                </div>
            </div>
        );
    }

    // 3. Active Call Screen (PiP WhatsApp Style)
    return (
        <div className="fixed inset-0 z-[60] bg-black">
            {/* Main Video (Background) */}
            <div className="absolute inset-0 w-full h-full">
                <video
                    playsInline
                    ref={isSwapped ? myVideoRef : userVideoRef}
                    autoPlay
                    className={`w-full h-full object-cover ${isSwapped ? "-scale-x-100" : ""}`}
                />
                {!remoteStream && !isSwapped && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                        <div className="text-center">
                            <div className="loading loading-spinner loading-lg text-primary mb-4" />
                            <p className="text-zinc-400">Connecting video...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Small Video (PiP) */}
            <div
                onClick={toggleSwap}
                className="absolute top-6 right-6 w-32 h-44 sm:w-48 sm:h-64 bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-pointer z-10 transition-all hover:scale-105"
            >
                <video
                    playsInline
                    muted={!isSwapped}
                    ref={isSwapped ? userVideoRef : myVideoRef}
                    autoPlay
                    className={`w-full h-full object-cover ${!isSwapped ? "-scale-x-100" : ""}`}
                />
                <div className="absolute bottom-2 left-2 bg-black/40 px-2 py-0.5 rounded text-[10px] text-white backdrop-blur-sm">
                    {isSwapped ? (call.name || "Remote") : "You"}
                </div>
            </div>

            {/* Call Controls Overlay */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 sm:gap-6 px-6 py-4 bg-zinc-900/60 backdrop-blur-xl rounded-full border border-white/10 z-20">
                <button
                    onClick={toggleMute}
                    className={`size-12 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
                >
                    {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                </button>

                <button
                    onClick={leaveCall}
                    className="size-14 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all hover:scale-110 shadow-lg shadow-red-500/40"
                >
                    <PhoneOff className="size-7" />
                </button>

                <button
                    onClick={toggleVideo}
                    className={`size-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
                >
                    {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
                </button>
            </div>

            {/* Name Overlay */}
            <div className="absolute top-8 left-8 z-10">
                <h3 className="text-white text-xl font-semibold drop-shadow-lg">
                    {call.name || "Video Call"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-white/70 text-sm">00:00</span>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
