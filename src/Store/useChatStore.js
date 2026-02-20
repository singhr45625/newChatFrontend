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

    searchUser: async (query) => {
        set({ isSearchLoading: true });
        try {
            // Use 'params' for automatic query string construction and encoding
            const res = await axiosInstance.get("/messages/search", {
                params: { query }
            });
            const searchedUsers = res.data; // Expecting an array now

            if (!Array.isArray(searchedUsers)) {
                // Backward compatibility if backend sends single object
                const user = searchedUsers;
                const { users } = get();
                if (!users.some((u) => u._id === user._id)) {
                    set({ users: [...users, user] });
                }
                set({ selectedUser: user, selectedGroup: null });
                toast.success(`Found user: ${user.fullName}`);
                return;
            }

            // If we found multiple users, add all new ones to the sidebar
            const { users } = get();
            const newUsersList = [...users];
            let addedCount = 0;

            searchedUsers.forEach(searchedUser => {
                if (!newUsersList.some((u) => u._id === searchedUser._id)) {
                    newUsersList.push(searchedUser);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                set({ users: newUsersList });
            }

            // Select the first one found for immediate interaction
            if (searchedUsers.length > 0) {
                set({ selectedUser: searchedUsers[0], selectedGroup: null });
                toast.success(`Found ${searchedUsers.length} user(s)`);
            }
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

    sendMessage: async (messageData, receiverIdOverride = null) => {
        const { selectedUser, selectedGroup, messages } = get();
        const authUser = useAuthStore.getState().authUser;

        const targetReceiverId = receiverIdOverride || selectedUser?._id;
        const targetGroupId = selectedGroup?._id;

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

        if (targetReceiverId) {
            optimisticMessage.receiverId = targetReceiverId;
        } else if (targetGroupId) {
            optimisticMessage.groupId = targetGroupId;
        }

        // Only add to UI if it belongs to the current conversation
        if (targetReceiverId === selectedUser?._id || targetGroupId === selectedGroup?._id) {
            set({ messages: [...messages, optimisticMessage] });
        }

        try {
            let res;
            if (targetReceiverId) {
                res = await axiosInstance.post(`/messages/send/${targetReceiverId}`, messageData);
            } else if (targetGroupId) {
                res = await axiosInstance.post(`/messages/groups/send/${targetGroupId}`, messageData);
            }

            // Replace optimistic message with actual message from server
            if (targetReceiverId === selectedUser?._id || targetGroupId === selectedGroup?._id) {
                set((state) => ({
                    messages: state.messages.map((m) => m._id === tempId ? res.data : m)
                }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
            // Remove optimistic message on failure
            if (targetReceiverId === selectedUser?._id || targetGroupId === selectedGroup?._id) {
                set((state) => ({
                    messages: state.messages.filter((m) => m._id !== tempId)
                }));
            }
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

        socket.on("newMessage", async (newMessage) => {
            console.log("[FRONTEND] Received 'newMessage':", newMessage);

            // Check if the sender is already in our users list
            const { users, selectedUser } = get();
            const senderId = newMessage.senderId;
            const userExists = users.some((u) => u._id === senderId);

            if (!userExists) {
                try {
                    // Fetch user details if they are not in the sidebar
                    const res = await axiosInstance.get(`/messages/participant/${senderId}`);
                    const newUser = res.data;
                    set({ users: [...get().users, newUser] });
                    console.log("[FRONTEND] New user added to sidebar:", newUser.fullName);
                } catch (error) {
                    console.error("[FRONTEND] Error fetching new participant details:", error);
                }
            }

            const isMessageSentToSelectedUser = senderId === selectedUser?._id;
            console.log(`[FRONTEND] Current selectedUser: ${selectedUser?._id}, Message Sender: ${senderId}, Should Update Chat: ${isMessageSentToSelectedUser}`);

            if (isMessageSentToSelectedUser) {
                set({
                    messages: [...get().messages, newMessage],
                });
            }
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


