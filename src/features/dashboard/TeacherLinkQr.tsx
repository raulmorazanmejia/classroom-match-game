type Props = {
  link: string;
  label?: string;
  size?: number;
};

export default function TeacherLinkQr({ link, label = 'Student QR Code', size = 220 }: Props) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`;

  return (
    <figure className="inline-flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-white p-3">
      <img
        src={src}
        alt={`${label} for ${link}`}
        width={size}
        height={size}
        className="h-auto w-full max-w-[220px] rounded-lg border border-slate-200 bg-white"
        loading="lazy"
      />
      <figcaption className="text-xs font-medium text-slate-600">{label}</figcaption>
    </figure>
  );
}
