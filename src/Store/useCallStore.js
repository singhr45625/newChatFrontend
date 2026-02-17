import { create } from "zustand";
import Peer from "simple-peer";
import { useAuthStore } from "./useAuthStore";

export const useCallStore = create((set, get) => ({
    call: {},
    callAccepted: false,
    callEnded: false,
    stream: null,
    remoteStream: null,
    name: "",
    myVideo: null,
    userVideo: null,
    connectionRef: null,
    otherUserId: null,

    setStream: (stream) => set({ stream }),
    setRemoteStream: (remoteStream) => set({ remoteStream }),
    setCall: (call) => set({ call }),
    setCallAccepted: (val) => set({ callAccepted: val }),
    setCallEnded: (val) => {
        set({ callEnded: val });
        if (val) set({ remoteStream: null });
    },

    answerCall: () => {
        set({ callAccepted: true });
        const { socket } = useAuthStore.getState();
        const { stream, call } = get();

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

    callUser: (id) => {
        const { socket, authUser } = useAuthStore.getState();
        const { stream } = get();

        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on("signal", (data) => {
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

        socket.on("callAccepted", (signal) => {
            set({ callAccepted: true });
            peer.signal(signal);
        });

        set({ connectionRef: peer, otherUserId: id });
    },

    leaveCall: () => {
        const { socket } = useAuthStore.getState();
        const { otherUserId, connectionRef } = get();

        if (socket && otherUserId) {
            socket.emit("endCall", { to: otherUserId });
        }

        set({
            callAccepted: false,
            callEnded: true,
            otherUserId: null,
            remoteStream: null,
        });

        if (connectionRef) connectionRef.destroy();
        window.location.reload(); // Simple way to reset state
    },
}));
