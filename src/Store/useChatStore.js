import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../Lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    groups: [],
    selectedUser: null,
    selectedGroup: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    isGroupsLoading: false,

    getUsers: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/users");
            set({ users: res.data });
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getGroups: async () => {
        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstance.get("/messages/groups/all");
            set({ groups: res.data });
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data });
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    getGroupMessages: async (groupId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/groups/${groupId}`);
            set({ messages: res.data });
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, selectedGroup, messages } = get();
        try {
            let res;
            if (selectedUser) {
                res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            } else if (selectedGroup) {
                res = await axiosInstance.post(`/messages/groups/send/${selectedGroup._id}`, messageData);
            }
            set({ messages: [...messages, res.data] });
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    createGroup: async (groupData) => {
        try {
            const res = await axiosInstance.post("/messages/groups", groupData);
            set({ groups: [...get().groups, res.data] });
            toast.success("Group created successfully");
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    subscribeToMessages: () => {
        const { selectedUser, selectedGroup } = get();
        if (!selectedUser && !selectedGroup) return;

        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");
        socket.off("newGroupMessage");

        socket.on("newMessage", (newMessage) => {
            const isMessageSentToSelectedUser = newMessage.senderId === selectedUser?._id;
            if (!isMessageSentToSelectedUser) return;

            set({
                messages: [...get().messages, newMessage],
            });
        });

        socket.on("newGroupMessage", (newGroupMessage) => {
            if (newGroupMessage.groupId !== selectedGroup?._id) return;
            set({
                messages: [...get().messages, newGroupMessage],
            });
        });
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("newGroupMessage");
    },

    setSelectedUser: (selectedUser) => set({ selectedUser, selectedGroup: null }),
    setSelectedGroup: (selectedGroup) => set({ selectedGroup, selectedUser: null }),
}));
