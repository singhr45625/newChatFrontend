import { create } from "zustand";
import Peer from "simple-peer";
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

    setStream: (stream) => set({ stream }),
    setRemoteStream: (remoteStream) => set({ remoteStream }),
    setCall: (call) => set({ call, isRinging: !!call.isReceivingCall }),
    setCallAccepted: (val) => set({ callAccepted: val, isRinging: false, isCalling: false }),
    setCallEnded: (val) => {
        set({ callEnded: val, isCalling: false, isRinging: false, isOtherUserRinging: false });
        if (val) set({ remoteStream: null });
    },
    toggleSwap: () => set((state) => ({ isSwapped: !state.isSwapped })),

    getMediaStream: async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            set({ stream });
            return stream;
        } catch (error) {
            console.error("Error getting media stream:", error);
            return null;
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
            await axiosInstance.post(`/messages/send/${otherUserId}`, {
                text: `📞 Video call ended - ${durationStr}`
            });
        } catch (error) {
            console.error("Error saving call history:", error);
        }
    }
}));
