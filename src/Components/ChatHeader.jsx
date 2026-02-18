import { Phone, Video, X } from "lucide-react";
import { useAuthStore } from "../Store/useAuthStore";
import { useChatStore } from "../Store/useChatStore";
import { useCallStore } from "../Store/useCallStore";

const ChatHeader = () => {
    const { selectedUser, setSelectedUser, selectedGroup, setSelectedGroup } = useChatStore();
    const { onlineUsers } = useAuthStore();
    const { callUser } = useCallStore();

    const handleClose = () => {
        setSelectedUser(null);
        setSelectedGroup(null);
    }

    const displayName = selectedUser ? selectedUser.fullName : selectedGroup?.name;
    const displaySub = selectedUser
        ? (onlineUsers.includes(selectedUser._id) ? "Online" : "Offline")
        : "Group Chat";

    return (
        <div className="p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                        {selectedUser ? (
                            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} className="size-11 rounded-2xl object-cover border border-gray-100" />
                        ) : (
                            <div className="size-11 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                                {selectedGroup?.name.charAt(0)}
                            </div>
                        )}
                    </div>

                    {/* User info */}
                    <div>
                        <h3 className="font-bold text-gray-800">{displayName}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            {selectedUser && onlineUsers.includes(selectedUser._id) && <span className="size-2 bg-green-500 rounded-full" />}
                            {displaySub}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedUser && (
                        <>
                            <button onClick={() => callUser(selectedUser._id, selectedUser.fullName)} className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-600 border border-gray-100 transition-all hover:border-indigo-100 hover:text-indigo-600">
                                <Phone className="size-5" />
                            </button>
                            <button onClick={() => callUser(selectedUser._id, selectedUser.fullName)} className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-600 border border-gray-100 transition-all hover:border-indigo-100 hover:text-indigo-600">
                                <Video className="size-5" />
                            </button>
                        </>
                    )}
                    {/* Close button */}
                    <button onClick={handleClose} className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-400 border border-transparent hover:border-gray-100 transition-all">
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
export default ChatHeader;
