import { useEffect, useState } from "react";
import { useChatStore } from "../Store/useChatStore";
import { useAuthStore } from "../Store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus, Hash, Search } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
    const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, groups, getGroups, setSelectedGroup, selectedGroup, searchUser, isSearchLoading } = useChatStore();

    const { onlineUsers } = useAuthStore();
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState("");

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchEmail.trim()) return;
        await searchUser(searchEmail.trim());
        setSearchEmail("");
    };

    useEffect(() => {
        getUsers();
        getGroups();
    }, [getUsers, getGroups]);

    const filteredUsers = showOnlineOnly
        ? users.filter((user) => onlineUsers.includes(user._id))
        : users;

    if (isUsersLoading) return <SidebarSkeleton />;

    return (
        <aside className="h-full w-20 lg:w-72 border-r border-gray-200 flex flex-col transition-all duration-200 bg-white">
            <div className="border-b border-gray-200 w-full p-5">
                <div className="flex items-center gap-2">
                    <Users className="size-6" />
                    <span className="font-medium hidden lg:block">Contacts</span>
                </div>
                {/* Online filter toggle */}
                <div className="mt-3 hidden lg:flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={showOnlineOnly}
                            onChange={(e) => setShowOnlineOnly(e.target.checked)}
                            className="checkbox checkbox-sm checkbox-primary"
                        />
                        <span className="text-sm">Show online only</span>
                    </label>
                    <span className="text-xs text-gray-500">({onlineUsers.length - 1} online)</span>
                </div>

                {/* Search input */}
                <form onSubmit={handleSearch} className="mt-4 hidden lg:flex gap-2">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="input input-sm input-bordered w-full bg-gray-50 h-9 rounded-xl focus:bg-white transition-all text-sm"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary h-9 w-9 p-0 rounded-xl"
                        disabled={isSearchLoading || !searchEmail.trim()}
                    >
                        {isSearchLoading ? <span className="loading loading-spinner loading-xs"></span> : <Search className="size-4" />}
                    </button>
                </form>
            </div>

            <div className="overflow-y-auto w-full py-3">
                {/* Groups Section */}
                <div className="px-5 mb-4 hidden lg:flex items-center justify-between text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <span>Groups</span>
                    <button onClick={() => setShowGroupModal(true)} title="Create Group" className="hover:text-indigo-600 transition-colors">
                        <Plus className="size-4 cursor-pointer" />
                    </button>
                </div>

                {groups.map((group) => (
                    <button
                        key={group._id}
                        onClick={() => setSelectedGroup(group)}
                        className={`
               w-full p-3 flex items-center gap-3
               hover:bg-gray-50 transition-colors
               ${selectedGroup?._id === group._id ? "bg-indigo-50/50 ring-1 ring-indigo-100" : ""}
             `}
                    >
                        <div className="relative mx-auto lg:mx-0">
                            <div className="size-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                                <Hash className="size-6 text-indigo-600" />
                            </div>
                        </div>

                        {/* Group info - only visible on larger screens */}
                        <div className="hidden lg:block text-left min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{group.name}</div>
                            <div className="text-xs text-gray-400">Group</div>
                        </div>
                    </button>
                ))}

                {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} />}

                <div className="px-5 my-4 hidden lg:block text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    Direct Messages
                </div>

                {filteredUsers.map((user) => (
                    <button
                        key={user._id}
                        onClick={() => setSelectedUser(user)}
                        className={`
              w-full p-3 flex items-center gap-3
              hover:bg-gray-50 transition-colors
              ${selectedUser?._id === user._id ? "bg-indigo-50/50 ring-1 ring-indigo-100" : ""}
            `}
                    >
                        <div className="relative mx-auto lg:mx-0">
                            <img
                                src={user.profilePic || "/avatar.png"}
                                alt={user.name}
                                className="size-12 object-cover rounded-2xl border border-gray-100"
                            />
                            {onlineUsers.includes(user._id) && (
                                <span
                                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-white"
                                />
                            )}
                        </div>

                        {/* User info - only visible on larger screens */}
                        <div className="hidden lg:block text-left min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{user.fullName}</div>
                            <div className="text-xs text-gray-400">
                                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                            </div>
                        </div>
                    </button>
                ))}

                {filteredUsers.length === 0 && onlineUsers.length > 0 && (
                    <div className="text-center text-gray-500 py-4 text-sm">No online users</div>
                )}
            </div>
        </aside>
    );
};
export default Sidebar;


