import { useRef, useEffect, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import { PhoneOff, Phone, Mic, MicOff, Video, VideoOff, Camera, Minimize2, Maximize2, ChevronLeft } from "lucide-react";

const VideoPlayer = () => {
    const {
        callAccepted,
        stream,
        remoteStream,
        call,
        leaveCall,
        answerCall,
        isCalling,
        isRinging,
        isOtherUserRinging,
        isSwapped,
        toggleSwap,
        isMinimized,
        setIsMinimized,
        switchCamera,
        facingMode
    } = useCallStore();

    const myVideoRef = useRef();
    const userVideoRef = useRef();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [timer, setTimer] = useState("00:00");

    // Draggable State
    const [position, setPosition] = useState({ x: window.innerWidth - 200, y: 100 });
    const dragRef = useRef(null);
    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    const { callStartTime } = useCallStore();

    useEffect(() => {
        let interval;
        if (callAccepted && callStartTime) {
            interval = setInterval(() => {
                const durationInSeconds = Math.floor((Date.now() - callStartTime) / 1000);
                const minutes = Math.floor(durationInSeconds / 60);
                const seconds = durationInSeconds % 60;
                setTimer(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
            }, 1000);
        } else {
            // Re-zero timer when not in call, but only if not already zero
            // to avoid cascading renders warning
        }
        return () => clearInterval(interval);
    }, [callAccepted, callStartTime]);

    // Separate effect for resetting timer to avoid cascading render warning in main effect
    useEffect(() => {
        if (!callAccepted || !callStartTime) {
            const timeout = setTimeout(() => {
                setTimer((prev) => (prev !== "00:00" ? "00:00" : prev));
            }, 0);
            return () => clearTimeout(timeout);
        }
    }, [callAccepted, callStartTime]);

    useEffect(() => {
        if (stream && myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
            myVideoRef.current.play().catch(err => console.error("Local video play error:", err));
        }
    }, [stream, isCalling, isRinging, callAccepted, isSwapped, isMinimized]);

    useEffect(() => {
        if (remoteStream && userVideoRef.current) {
            userVideoRef.current.srcObject = remoteStream;
            userVideoRef.current.play().catch(err => console.error("Remote video play error:", err));
        }
    }, [remoteStream, callAccepted, isSwapped, isMinimized]);

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

    // ----- Draggable Logic -----
    const handleMouseDown = (e) => {
        // Prevent dragging if clicking buttons
        if (e.target.closest('button')) return;

        isDragging.current = true;
        offset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;

        // Calculate new position
        let newX = e.clientX - offset.current.x;
        let newY = e.clientY - offset.current.y;

        // Boundary checks (keep fully on screen)
        const width = window.innerWidth < 640 ? 128 : 160; // w-32 or sm:w-40
        const height = (width * 16) / 9;
        const maxX = window.innerWidth - width;
        const maxY = window.innerHeight - height;

        // Clamp values
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > maxX) newX = maxX;
        if (newY > maxY) newY = maxY;

        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
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

    // 3. Active Call Screen
    if (isMinimized) {
        return (
            <div
                ref={dragRef}
                style={{ left: position.x, top: position.y }}
                onMouseDown={handleMouseDown}
                className="fixed w-32 h-auto aspect-[9/16] sm:w-40 bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-700/50 z-[100] cursor-grab active:cursor-grabbing group hover:shadow-indigo-500/20 transition-shadow"
            >
                {/* Main View (Remote) */}
                <div className="relative w-full h-full bg-zinc-800">
                    <video
                        playsInline
                        ref={isSwapped ? myVideoRef : userVideoRef}
                        autoPlay
                        className={`w-full h-full object-cover ${(isSwapped && facingMode === 'user') ? "-scale-x-100" : ""}`}
                    />

                    {/* Overlay Protection for dragging over video */}
                    <div className="absolute inset-0 z-10 bg-transparent" />
                </div>

                {/* PiP View (Local) */}
                <div className="absolute bottom-2 right-2 w-10 h-16 bg-zinc-950 rounded-lg overflow-hidden shadow-lg border border-white/10 z-20">
                    <video
                        playsInline
                        muted={!isSwapped}
                        ref={isSwapped ? userVideoRef : myVideoRef}
                        autoPlay
                        className={`w-full h-full object-cover ${(!isSwapped && facingMode === 'user') ? "-scale-x-100" : ""}`}
                    />
                </div>

                {/* Controls (Hover only) */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex flex-col items-center justify-center gap-4">
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm transition-all transform hover:scale-110"
                        title="Maximize"
                    >
                        <Maximize2 className="size-6" />
                    </button>
                    <button
                        onClick={leaveCall}
                        className="p-2 bg-red-500/80 hover:bg-red-600/90 rounded-full text-white backdrop-blur-sm transition-all transform hover:scale-110"
                        title="End Call"
                    >
                        <PhoneOff className="size-5" />
                    </button>
                </div>

                {/* Name Tag */}
                <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white backdrop-blur-sm truncate max-w-[80%] z-20 pointer-events-none">
                    {call.name || "Video Call"}
                </div>
            </div>
        );
    }

    // 4. MAXIMIZED View
    return (
        <div className="fixed inset-0 z-[60] bg-black">
            {/* Main Video (Background) */}
            <div className="absolute inset-0 w-full h-full">
                <video
                    playsInline
                    ref={isSwapped ? myVideoRef : userVideoRef}
                    autoPlay
                    className={`w-full h-full object-cover ${(isSwapped && facingMode === 'user') ? "-scale-x-100" : ""}`}
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
                className="absolute top-20 right-6 w-32 h-44 sm:w-48 sm:h-64 bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-pointer z-10 transition-all hover:scale-105"
            >
                <video
                    playsInline
                    muted={!isSwapped}
                    ref={isSwapped ? userVideoRef : myVideoRef}
                    autoPlay
                    className={`w-full h-full object-cover ${(!isSwapped && facingMode === 'user') ? "-scale-x-100" : ""}`}
                />
                <div className="absolute bottom-2 left-2 bg-black/40 px-2 py-0.5 rounded text-[10px] text-white backdrop-blur-sm">
                    {isSwapped ? (call.name || "Remote") : "You"}
                </div>
            </div>

            {/* Top Navigation / Back Button */}
            <div className="absolute top-8 left-8 flex items-center gap-4 z-20">
                <button
                    onClick={() => setIsMinimized(true)}
                    className="size-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/10 group"
                >
                    <ChevronLeft className="size-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div>
                    <h3 className="text-white text-xl font-semibold drop-shadow-lg">
                        {call.name || "Video Call"}
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-white/70 text-sm">{timer}</span>
                    </div>
                </div>
            </div>

            {/* Call Controls Overlay */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 px-6 py-4 bg-zinc-900/60 backdrop-blur-xl rounded-full border border-white/10 z-20">
                <button
                    onClick={toggleMute}
                    className={`size-12 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
                >
                    {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`size-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
                >
                    {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
                </button>

                <button
                    onClick={switchCamera}
                    className="size-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                    title="Switch Camera"
                >
                    <Camera className="size-5" />
                </button>

                <div className="w-px h-8 bg-white/10 mx-2" />

                <button
                    onClick={leaveCall}
                    className="size-14 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all hover:scale-110 shadow-lg shadow-red-500/40"
                    title="End Call"
                >
                    <PhoneOff className="size-7" />
                </button>

                <div className="w-px h-8 bg-white/10 mx-2" />

                <button
                    onClick={() => setIsMinimized(true)}
                    className="size-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                    title="Minimize"
                >
                    <Minimize2 className="size-5" />
                </button>
            </div>
        </div>
    );
};

export default VideoPlayer;



