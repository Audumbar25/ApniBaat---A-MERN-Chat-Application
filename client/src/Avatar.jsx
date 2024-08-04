/* eslint-disable react/prop-types */
export default function Avatar({ src, userId, username, online }) {
  const colors = ['bg-teal-200', 'bg-red-200',
                  'bg-green-200', 'bg-purple-200',
                  'bg-blue-200', 'bg-yellow-200',
                  'bg-orange-200', 'bg-pink-200', 'bg-fuchsia-200', 'bg-rose-200'];

  let colorIndex = 0;

  if (userId && userId.length >= 10) {
    const userIdBase10 = parseInt(userId.substring(10), 16);
    colorIndex = userIdBase10 % colors.length;
  }

  const color = colors[colorIndex];

  return (
    <div className={"w-8 h-8 relative rounded-full flex items-center justify-center " + color}>
      {src ? (
        <img src={src} alt={username} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="text-center w-full opacity-70">{username ? username[0] : '?'}</div>
      )}
      {online ? (
        <div className="absolute w-3 h-3 bg-green-400 bottom-0 right-0 rounded-full border border-white"></div>
      ) : (
        <div className="absolute w-3 h-3 bg-gray-400 bottom-0 right-0 rounded-full border border-white"></div>
      )}
    </div>
  );
}
