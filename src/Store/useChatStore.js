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
    isSearchLoading: false,

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

    searchUser: async (email) => {
        set({ isSearchLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/search?email=${email}`);
            const searchedUser = res.data;

            // Add searched user to the users list if they are not already there
            const { users } = get();
            const userExists = users.some((u) => u._id === searchedUser._id);

            if (!userExists) {
                set({ users: [...users, searchedUser] });
            }

            set({ selectedUser: searchedUser, selectedGroup: null });
            toast.success(`Found user: ${searchedUser.fullName}`);
        } catch (error) {
            toast.error(error.response?.data?.message || "User not found");
        } finally {
            set({ isSearchLoading: false });
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
        const authUser = useAuthStore.getState().authUser;

        // Optimistic update
        const tempId = Date.now().toString();
        const optimisticMessage = {
            _id: tempId,
            senderId: authUser._id,
            text: messageData.text,
            image: messageData.image,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };

        if (selectedUser) {
            optimisticMessage.receiverId = selectedUser._id;
        } else if (selectedGroup) {
            optimisticMessage.groupId = selectedGroup._id;
        }

        set({ messages: [...messages, optimisticMessage] });

        try {
            let res;
            if (selectedUser) {
                res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            } else if (selectedGroup) {
                res = await axiosInstance.post(`/messages/groups/send/${selectedGroup._id}`, messageData);
            }

            // Replace optimistic message with actual message from server
            set((state) => ({
                messages: state.messages.map((m) => m._id === tempId ? res.data : m)
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
            // Remove optimistic message on failure
            set((state) => ({
                messages: state.messages.filter((m) => m._id !== tempId)
            }));
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
