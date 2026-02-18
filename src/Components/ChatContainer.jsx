import { useChatStore } from "../Store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../Store/useAuthStore";
import { formatMessageTime } from "../Lib/utils";

const ChatContainer = () => {
    const {
        messages,
        getMessages,
        isMessagesLoading,
        selectedUser,
        subscribeToMessages,
        unsubscribeFromMessages,
        selectedGroup,
        getGroupMessages
    } = useChatStore();
    const { authUser } = useAuthStore();
    const messageEndRef = useRef(null);

    useEffect(() => {
        if (selectedUser) getMessages(selectedUser._id);
        if (selectedGroup) getGroupMessages(selectedGroup._id);

        subscribeToMessages();

        return () => unsubscribeFromMessages();
    }, [selectedUser?._id, selectedGroup?._id, getMessages, getGroupMessages, subscribeToMessages, unsubscribeFromMessages]);

    useEffect(() => {
        if (messageEndRef.current && messages) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    if (isMessagesLoading) {
        return (
            <div className="flex-1 flex flex-col overflow-auto">
                <ChatHeader />
                <MessageSkeleton />
                <MessageInput />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-auto">
            <ChatHeader />

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message._id}
                        className={`flex ${message.senderId === authUser._id ? "justify-end" : "justify-start"}`}
                        ref={messageEndRef}
                    >
                        <div className="max-w-[80%] flex flex-col">
                            <div className="text-xs text-gray-400 mb-1 ml-1">
                                {message.senderId === authUser._id ? "You" : selectedUser?.fullName || "Member"}
                            </div>
                            <div
                                className={`
                  p-3 rounded-2xl shadow-sm
                  ${message.senderId === authUser._id
                                        ? "bg-indigo-600 text-white rounded-tr-none"
                                        : "bg-white border border-gray-100 rounded-tl-none text-gray-800"}
                `}
                            >
                                {message.image && (
                                    <img
                                        src={message.image}
                                        alt="Attachment"
                                        className="sm:max-w-[200px] rounded-md mb-2"
                                    />
                                )}
                                {message.text && <p>{message.text}</p>}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1 self-end flex items-center gap-1">
                                {message.isOptimistic ? (
                                    <span className="animate-pulse italic">Sending...</span>
                                ) : (
                                    formatMessageTime(message.createdAt)
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <MessageInput />
        </div>
    );
};
export default ChatContainer;
