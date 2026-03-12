import fs from "fs";
import path from "path";
import { Profile, ProfileLink } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILES_FILE = path.join(DATA_DIR, "profiles.json");
const LINKS_FILE = path.join(DATA_DIR, "links.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJSON<T>(filePath: string, data: T) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function getProfiles(): Profile[] {
  return readJSON<Profile[]>(PROFILES_FILE, []);
}

export function getProfile(id: string): Profile | undefined {
  return getProfiles().find((p) => p.id === id);
}

export function addProfile(profile: Profile) {
  const profiles = getProfiles();
  profiles.push(profile);
  writeJSON(PROFILES_FILE, profiles);
}

export function toggleBlock(id: string): Profile | undefined {
  const profiles = getProfiles();
  const profile = profiles.find((p) => p.id === id);
  if (profile) {
    profile.blocked = !profile.blocked;
    writeJSON(PROFILES_FILE, profiles);
  }
  return profile;
}

export function getLinks(): ProfileLink[] {
  return readJSON<ProfileLink[]>(LINKS_FILE, []);
}

export function addLink(link: ProfileLink) {
  const links = getLinks();
  links.push(link);
  writeJSON(LINKS_FILE, links);
}

export function getLinkByToken(token: string): ProfileLink | undefined {
  return getLinks().find((l) => l.token === token);
}

export function saveUploadedImage(base64: string, filename: string): string {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const matches = base64.match(/^data:image\/\w+;base64,(.+)$/);
  if (!matches) throw new Error("Invalid image data");
  const buffer = Buffer.from(matches[1], "base64");
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}
