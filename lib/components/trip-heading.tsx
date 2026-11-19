import Image from "next/image";
import Link from "next/link";
import { dateLabel } from "@/lib/calendar/time";
type Props = {
  title: string;
  destination: string;
  image: string | null;
  days: number;
  startDate: string | null;
  endDate: string | null;
  timezone: string | null;
  role: string;
  publicView?: boolean;
};
export function TripHeading({
  title,
  destination,
  image,
  days,
  startDate,
  endDate,
  timezone,
  role,
  publicView,
}: Props) {
  return (
    <header className="space-y-5">
      <Link href={publicView ? "/" : "/dashboard"} className="text-sm muted hover:underline">
        {publicView ? "TravelTogether" : "← Your trips"}
      </Link>
      <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{destination}</p>
          <h1 className="page-title mt-2 break-words">{title}</h1>
          <p className="mt-3 text-sm">
            {startDate
              ? `${dateLabel(startDate)}${endDate && endDate !== startDate ? ` – ${dateLabel(endDate)}` : ""}`
              : "Dates open"}{" "}
            <span className="muted">
              · {days} {days === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="mt-2 text-sm muted">
            {role}
            {timezone ? ` · Times in ${timezone.replaceAll("_", " ")}` : ""}
          </p>
        </div>
        {image ? (
          <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-sm sm:h-36 sm:w-56">
            <Image
              src={image}
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 100vw, 224px"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
