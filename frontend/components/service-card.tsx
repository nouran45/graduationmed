import Link from "next/link";
import {
  Scan,
  ArrowRight,
  Stethoscope,
  Camera,
  MessageCircle,
  Heart,
  Droplets,
  Bone,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface ServiceCardProps {
  title: string;
  description: string;
  /** e.g. "stethoscope" | "camera" | "message-circle" | "xray" | "heart" | "droplets" | "scan" | "building" */
  icon?: IconKey;
  link: string;
}

const iconMap = {
  stethoscope: Stethoscope,
  camera: Camera,
  "message-circle": MessageCircle,
  heart: Heart,
  xray: Bone,
  scan: Scan,
  droplets: Droplets,
  building: Building,
  default: ShieldCheck,
} as const;

type IconKey = keyof typeof iconMap;

export function ServiceCard({
  title,
  description,
  icon = "default",
  link,
}: ServiceCardProps) {
  const IconComponent = iconMap[icon] ?? iconMap.default;

  return (
    <Link href={link} aria-label={`${title} - Learn More`}>
      <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer group">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>

          <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <p className="text-gray-600 mb-4 flex-grow">{description}</p>

          <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
            Learn More
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/** allow default import as well */
export default ServiceCard;