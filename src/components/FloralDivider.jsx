/* Nhành hoa lá nhỏ ngăn cách giữa các phần.
   Vẽ hoàn toàn bằng SVG nội tuyến — không tải ảnh, không tải icon font,
   và tự đổi màu theo màu chữ của phần tử cha. */
export default function FloralDivider() {
  return (
    <div className="divider" aria-hidden="true">
      <svg width="52" height="20" viewBox="0 0 52 20" fill="none">
        {/* Cành chính */}
        <path
          d="M2 10h14M36 10h14"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Hai chiếc lá hai bên */}
        <path
          d="M16 10c1.8-3.4 4.4-4.6 6.6-4.2-.5 3-2.6 4.8-6.6 4.2Z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M36 10c-1.8 3.4-4.4 4.6-6.6 4.2.5-3 2.6-4.8 6.6-4.2Z"
          fill="currentColor"
          opacity="0.55"
        />
        {/* Bông hoa ở giữa, cánh xoay quanh nhuỵ */}
        <g transform="translate(26 10)">
          <g fill="var(--rose)" opacity="0.85">
            <ellipse cx="0" cy="-4.2" rx="2" ry="3.1" />
            <ellipse cx="0" cy="4.2" rx="2" ry="3.1" />
            <ellipse cx="-4.2" cy="0" rx="3.1" ry="2" />
            <ellipse cx="4.2" cy="0" rx="3.1" ry="2" />
          </g>
          <circle cx="0" cy="0" r="1.9" fill="var(--gold)" />
        </g>
      </svg>
    </div>
  )
}
