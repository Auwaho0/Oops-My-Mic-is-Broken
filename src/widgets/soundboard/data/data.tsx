import { type Group } from "@/features/soundboard/GroupSection";
import {
  Baby,
  BellRing,
  Construction,
  Cpu,
  Dog,
  Hammer,
  Home,
  Radio,
  Wrench,
} from "lucide-react";
import { ru } from "@/shared/i18n/ru";

export const GROUPS: Group[] = [
  {
    id: "renovation",
    title: ru.soundboard.groups.renovation.title,
    note: ru.soundboard.groups.renovation.note,
    items: [
      {
        id: "drill",
        label: ru.soundboard.sounds.drill.label,
        sub: ru.soundboard.sounds.drill.sub,
        Icon: Wrench,
        durationSec: 12,
      },
      {
        id: "jackhammer",
        label: ru.soundboard.sounds.jackhammer.label,
        sub: ru.soundboard.sounds.jackhammer.sub,
        Icon: Construction,
        durationSec: 10,
      },
      {
        id: "hammer",
        label: ru.soundboard.sounds.hammer.label,
        sub: ru.soundboard.sounds.hammer.sub,
        Icon: Hammer,
        durationSec: 10,
      },
    ],
  },
  {
    id: "family",
    title: ru.soundboard.groups.family.title,
    note: ru.soundboard.groups.family.note,
    items: [
      {
        id: "baby",
        label: ru.soundboard.sounds.baby.label,
        sub: ru.soundboard.sounds.baby.sub,
        Icon: Baby,
        durationSec: 10,
      },
      {
        id: "dog",
        label: ru.soundboard.sounds.dog.label,
        sub: ru.soundboard.sounds.dog.sub,
        Icon: Dog,
        durationSec: 10,
      },
      {
        id: "socks",
        label: ru.soundboard.sounds.socks.label,
        sub: ru.soundboard.sounds.socks.sub,
        Icon: Home,
        durationSec: 8,
      },
    ],
  },
  {
    id: "tech",
    title: ru.soundboard.groups.tech.title,
    note: ru.soundboard.groups.tech.note,
    items: [
      {
        id: "static",
        label: ru.soundboard.sounds.static.label,
        sub: ru.soundboard.sounds.static.sub,
        Icon: Radio,
        durationSec: 12,
      },
      {
        id: "robot",
        label: ru.soundboard.sounds.robot.label,
        sub: ru.soundboard.sounds.robot.sub,
        Icon: Cpu,
        durationSec: 10,
      },
      {
        id: "doorbell",
        label: ru.soundboard.sounds.doorbell.label,
        sub: ru.soundboard.sounds.doorbell.sub,
        Icon: BellRing,
        durationSec: 8,
      },
    ],
  },
  {
    id: "other",
    title: ru.soundboard.groups.other.title,
    note: ru.soundboard.groups.other.note,
    items: [],
  },
];
