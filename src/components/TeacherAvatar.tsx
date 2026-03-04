"use client";

/** Generic avatar for teachers - male or female illustration. */
export function TeacherAvatar({
  avatarType,
  profileImageUrl,
  className = "w-16 h-16 rounded-xl",
}: {
  avatarType?: string | null;
  profileImageUrl?: string | null;
  className?: string;
}) {
  const type = avatarType === "male" || avatarType === "female" ? avatarType : "female";
  const isUrl = profileImageUrl && (profileImageUrl.startsWith("http") || profileImageUrl.startsWith("/"));

  if (isUrl) {
    return (
      <img
        src={profileImageUrl!}
        alt=""
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-gradient-to-br ${type === "male" ? "from-blue-400 to-blue-600" : "from-rose-400 to-rose-600"} ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        className="w-2/3 h-2/3 text-white/90"
        fill="currentColor"
      >
        <path d="M32 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm0 4c-8.8 0-16 7.2-16 16v4h4v-4c0-6.6 5.4-12 12-12s12 5.4 12 12v4h4v-4c0-8.8-7.2-16-16-16z" />
      </svg>
    </div>
  );
}
