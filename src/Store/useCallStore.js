import { create } from "zustand";
import Peer from "simple-peer";
import { toast } from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useCallStore = create((set, get) => ({
    call: {},
    callAccepted: false,
    callEnded: false,
    isCalling: false, // Outgoing call
    isRinging: false, // Incoming call
    isOtherUserRinging: false, // For the caller to know if the recipient's phone is ringing
    isSwapped: false, // For PiP layout
    stream: null,
    remoteStream: null,
    name: "",
    myVideo: null,
    userVideo: null,
    connectionRef: null,
    otherUserId: null,
    callStartTime: null,
    isMinimized: false,
    facingMode: "user",
    isSwitchingCamera: false,

    setIsMinimized: (val) => set({ isMinimized: val }),

    setStream: (stream) => set({ stream }),
    setRemoteStream: (remoteStream) => set({ remoteStream }),
    setCall: (call) => set({ call, isRinging: !!call.isReceivingCall }),
    setCallAccepted: (val) => set({ callAccepted: val, isRinging: false, isCalling: false }),
    setCallEnded: (val) => {
        set({ callEnded: val, isCalling: false, isRinging: false, isOtherUserRinging: false, isMinimized: false });
        if (val) set({ remoteStream: null });
    },
    toggleSwap: () => set((state) => ({ isSwapped: !state.isSwapped })),

    getMediaStream: async (fMode = null) => {
        try {
            const mode = fMode || get().facingMode;
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode },
                audio: true
            });
            set({ stream, facingMode: mode });
            return stream;
        } catch (error) {
            console.error("Error getting media stream:", error);
            return null;
        }
    },

    switchCamera: async () => {
        const { facingMode, stream, connectionRef, isSwitchingCamera } = get();
        if (isSwitchingCamera) return;

        const newMode = facingMode === "user" ? "environment" : "user";
        set({ isSwitchingCamera: true });

        toast.loading(`Switching to ${newMode === "user" ? "front" : "back"} camera...`, { id: "camera-switch" });

        try {
            console.log("CAMERA_SWITCH_START: Target Mode:", newMode);

            // 1. DISCONNECT HARDWARE IMMEDIATELY
            // Mobile devices (especially Android) are extremely strict about hardware access
            if (stream) {
                stream.getVideoTracks().forEach(track => {
                    track.stop();
                    console.log("NATIVE_SYNC: Stopped old track:", track.label);
                });
            }

            // 2. EXTENDED COOLDOWN (Definitive fix for "Could not start video source")
            // 500ms is the "sweet spot" for most mobile OSs to clear camera locks
            await new Promise(resolve => setTimeout(resolve, 500));

            // 3. ACQUIRE NEW MEDIA
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: newMode } },
                audio: false
            });

            const newVideoTrack = newStream.getVideoTracks()[0];
            console.log("NATIVE_SYNC: Acquired new track:", newVideoTrack.label);

            // 4. NATIVE TRACK REPLACEMENT (Definitive fix for "Cannot replace track that was never added")
            // We bypass simple-peer's replaceTrack and go straight to the browser's RTCRtpSender
            if (connectionRef && connectionRef._pc) {
                const pc = connectionRef._pc;
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');

                if (videoSender) {
                    console.log("NATIVE_SYNC: Found RTC video sender. Performing native replaceTrack...");
                    await videoSender.replaceTrack(newVideoTrack);
                    console.log("NATIVE_SYNC: Native replacement successful.");
                } else {
                    console.warn("NATIVE_SYNC: No video sender found in PeerConnection. If this is a new call, this is expected.");
                }
            }

            // 5. UPDATE LOCAL STATE
            const combinedStream = new MediaStream([
                ...(stream ? stream.getAudioTracks() : []),
                newVideoTrack
            ]);

            set({ stream: combinedStream, facingMode: newMode });
            toast.success(`Switched to ${newMode === "user" ? "front" : "back"} camera`, { id: "camera-switch" });
        } catch (error) {
            console.error("DEFINTIVE_CAMERA_ERROR:", error);
            toast.error(`Switch failed: ${error.message || "Hardware busy"}`, { id: "camera-switch" });

            // EMERGENCY RECOVERY: Try to restore ANY video if possible
            try {
                if (!get().stream || get().stream.getVideoTracks().filter(t => t.readyState === 'live').length === 0) {
                    console.log("NATIVE_SYNC: Attempting emergency hardware recovery...");
                    await get().getMediaStream();
                }
            } catch (recErr) {
                console.error("Recovery failed:", recErr);
            }
        } finally {
            set({ isSwitchingCamera: false });
        }
    },

    initializeCallListeners: () => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;

        console.log("Initializing call listeners...");

        // Clean up any existing listeners to avoid duplicates
        socket.off("callUser");
        socket.off("callAccepted");
        socket.off("endCall");
        socket.off("ringing");

        socket.on("callUser", ({ from, name: callerName, signal }) => {
            console.log("CALL_DEBUG: callUser event received from:", callerName, "Setting isRinging to true");
            set({ call: { isReceivingCall: true, from, name: callerName, signal }, isRinging: true });
            // Notify the caller that we are ringing
            socket.emit("notifyRinging", { to: from });
        });

        socket.on("ringing", () => {
            console.log("CALL_DEBUG: ringing event received (recipient acknowledges)");
            set({ isOtherUserRinging: true });
        });

        socket.on("callAccepted", (signal) => {
            console.log("Call accepted by other user");
            const { connectionRef } = get();
            if (connectionRef) {
                set({ callAccepted: true, isCalling: false, isOtherUserRinging: false, callStartTime: Date.now() });
                connectionRef.signal(signal);
            }
        });

        socket.on("endCall", () => {
            console.log("Call ended by other user");
            get().cleanupCall();
        });
    },

    answerCall: async () => {
        let { stream } = get();
        if (!stream) {
            stream = await get().getMediaStream();
        }
        if (!stream) return;

        set({ callAccepted: true, isRinging: false, callStartTime: Date.now() });
        const { socket } = useAuthStore.getState();
        const { call } = get();

        const peer = new Peer({ initiator: false, trickle: false, stream });

        peer.on("signal", (data) => {
            socket.emit("answerCall", { signal: data, to: call.from });
        });

        peer.on("stream", (currentStream) => {
            set({ remoteStream: currentStream });
        });

        peer.signal(call.signal);

        set({ connectionRef: peer, otherUserId: call.from });
    },

    callUser: async (id, name) => {
        let { stream } = get();
        if (!stream) {
            stream = await get().getMediaStream();
        }
        if (!stream) return;

        const { socket, authUser } = useAuthStore.getState();

        set({ isCalling: true, otherUserId: id, call: { ...get().call, name }, isOtherUserRinging: false });

        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on("signal", (data) => {
            console.log("CALL_DEBUG: Emitting callUser to:", id);
            socket.emit("callUser", {
                userToCall: id,
                signalData: data,
                from: authUser._id,
                name: authUser.fullName,
            });
        });

        peer.on("stream", (currentStream) => {
            set({ remoteStream: currentStream });
        });

        set({ connectionRef: peer });
    },

    cleanupCall: () => {
        const { connectionRef, stream } = get();

        if (connectionRef) {
            try {
                connectionRef.destroy();
            } catch (err) {
                console.error("Error destroying peer connection:", err);
            }
        }

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }

        const { callStartTime, callAccepted, otherUserId } = get();
        if (callAccepted && callStartTime && otherUserId) {
            get().saveCallHistory();
        }

        set({
            callAccepted: false,
            callEnded: true,
            isCalling: false,
            isRinging: false,
            isOtherUserRinging: false,
            otherUserId: null,
            remoteStream: null,
            stream: null,
            connectionRef: null,
            callStartTime: null,
            call: {},
        });

        // Ensure state is clean for next call
        setTimeout(() => set({ callEnded: false }), 2000);
    },

    leaveCall: () => {
        const { socket } = useAuthStore.getState();
        const { otherUserId } = get();

        if (socket && otherUserId) {
            socket.emit("endCall", { to: otherUserId });
        }

        get().cleanupCall();
    },

    saveCallHistory: async () => {
        const { callStartTime, otherUserId } = get();
        if (!callStartTime || !otherUserId) return;

        const durationInSeconds = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = durationInSeconds % 60;
        const durationStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        try {
            // Lazy load useChatStore to avoid circular dependencies
            const { useChatStore } = await import("./useChatStore");
            await useChatStore.getState().sendMessage(
                { text: `📞 Video call ended - ${durationStr}` },
                otherUserId
            );
        } catch (error) {
            console.error("Error saving call history:", error);
        }
    }
}));
