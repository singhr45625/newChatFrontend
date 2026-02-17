import { useRef, useEffect } from "react";
import { useCallStore } from "../Store/useCallStore";
import { useAuthStore } from "../Store/useAuthStore";
import { PhoneOff } from "lucide-react";

const VideoPlayer = () => {
    const { name, callAccepted, myVideo, userVideo, callEnded, stream, remoteStream, call, leaveCall, answerCall } = useCallStore();
    const { authUser, socket } = useAuthStore();

    const myVideoRef = useRef();
    const userVideoRef = useRef();

    useEffect(() => {
        if (stream && myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        if (remoteStream && userVideoRef.current) {
            userVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg">
                        {callAccepted && !callEnded ? "In Call" : "Calling..."}
                    </h2>
                    <button onClick={leaveCall} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors">
                        <PhoneOff className="size-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 aspect-video bg-gray-900">
                    {/* My Video */}
                    <div className="relative rounded-xl overflow-hidden bg-gray-800 border-2 border-primary/20">
                        <video playsInline muted ref={myVideoRef} autoPlay className="w-full h-full object-cover -scale-x-100" />
                        <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                            You (Camera)
                        </div>
                    </div>

                    {/* User Video */}
                    {callAccepted && !callEnded ? (
                        <div className="relative rounded-xl overflow-hidden bg-gray-800 border-2 border-indigo-500/20">
                            <video playsInline ref={userVideoRef} autoPlay className="w-full h-full object-cover" />
                            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                                {call.name || "User"}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center bg-gray-800 rounded-xl border-2 border-dashed border-gray-700">
                            <div className="text-center">
                                <div className="animate-pulse size-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PhoneOff className="size-8 text-indigo-400" />
                                </div>
                                <p className="text-gray-400">Waiting for answer...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Incoming Call UI */}
                {call.isReceivingCall && !callAccepted && (
                    <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-sm">Incoming Call from</p>
                            <h3 className="text-xl font-bold">{call.name}</h3>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={answerCall} className="bg-green-500 px-6 py-2 rounded-xl font-bold hover:bg-green-600 transition-colors">
                                Answer
                            </button>
                            <button onClick={leaveCall} className="bg-red-500 px-6 py-2 rounded-xl font-bold hover:bg-red-600 transition-colors">
                                Decline
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default VideoPlayer;
