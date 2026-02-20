import { useChatStore } from "../store/useChatStore";

import Sidebar from "../Components/Sidebar";
import NoChatSelected from "../Components/NoChatSelected";
import ChatContainer from "../Components/ChatContainer";

const HomePage = () => {
    const { selectedUser, selectedGroup } = useChatStore();

    return (
        <div className="h-screen bg-gray-50">
            <div className="flex items-center justify-center pt-20 px-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[calc(100vh-8rem)] border border-gray-200 overflow-hidden">
                    <div className="flex h-full rounded-lg overflow-hidden">
                        <Sidebar />

                        {(!selectedUser && !selectedGroup) ? <NoChatSelected /> : <ChatContainer />}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default HomePage;


