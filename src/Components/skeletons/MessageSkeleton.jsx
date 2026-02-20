const MessageSkeleton = () => {
    // Create 6 skeleton items
    const skeletonMessages = Array(6).fill(null);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {skeletonMessages.map((_, idx) => (
                <div key={idx} className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <div className="max-w-[80%] flex flex-col gap-2">
                        <div className={`skeleton h-10 w-40 rounded-2xl bg-gray-200 animate-pulse ${idx % 2 === 0 ? "rounded-tl-none" : "rounded-tr-none"}`} />
                        <div className="skeleton h-3 w-16 bg-gray-200 animate-pulse self-end" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MessageSkeleton;


