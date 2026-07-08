export interface Provider {
  id: string;
  name: string;
  category: string;
  avatar: string;
  verified: boolean;
  rating: number;
  jobs: number;
  distanceKm: number;
  online: boolean;
  priceFromKz: number;
}

export interface FeedPost {
  id: string;
  providerId: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
}

export const providers: Provider[] = [
  {
    id: "p1",
    name: "Mário Eletricista",
    category: "Eletricista",
    avatar: "https://i.pravatar.cc/120?img=12",
    verified: true,
    rating: 4.9,
    jobs: 184,
    distanceKm: 1.2,
    online: true,
    priceFromKz: 5000,
  },
  {
    id: "p2",
    name: "Ana Limpezas",
    category: "Limpeza",
    avatar: "https://i.pravatar.cc/120?img=47",
    verified: true,
    rating: 4.8,
    jobs: 312,
    distanceKm: 2.4,
    online: true,
    priceFromKz: 7500,
  },
  {
    id: "p3",
    name: "João Canalizador",
    category: "Canalização",
    avatar: "https://i.pravatar.cc/120?img=33",
    verified: false,
    rating: 4.6,
    jobs: 92,
    distanceKm: 3.1,
    online: false,
    priceFromKz: 6000,
  },
  {
    id: "p4",
    name: "Sofia Cabeleireira",
    category: "Beleza",
    avatar: "https://i.pravatar.cc/120?img=24",
    verified: true,
    rating: 5.0,
    jobs: 421,
    distanceKm: 0.8,
    online: true,
    priceFromKz: 4000,
  },
  {
    id: "p5",
    name: "Pedro Mudanças",
    category: "Mudanças",
    avatar: "https://i.pravatar.cc/120?img=15",
    verified: true,
    rating: 4.7,
    jobs: 156,
    distanceKm: 4.5,
    online: true,
    priceFromKz: 15000,
  },
  {
    id: "p6",
    name: "Carla Costureira",
    category: "Costura",
    avatar: "https://i.pravatar.cc/120?img=44",
    verified: false,
    rating: 4.5,
    jobs: 67,
    distanceKm: 1.9,
    online: true,
    priceFromKz: 3000,
  },
];

export const categories = [
  { id: "c1", label: "Canalizador", emoji: "🔧" },
  { id: "c2", label: "Eletricista", emoji: "⚡" },
  { id: "c3", label: "Pintor", emoji: "🎨" },
  { id: "c4", label: "Pedreiro", emoji: "🧱" },
  { id: "c5", label: "Jardineiro", emoji: "🌿" },
  { id: "c6", label: "Babá", emoji: "👶" },
  { id: "c7", label: "Empregada doméstica", emoji: "🧹" },
  { id: "c8", label: "Motorista", emoji: "🚗" },
  { id: "c9", label: "Técnico de informática", emoji: "💻" },
  { id: "c10", label: "Técnico de ar condicionado", emoji: "❄️" },
];

export const feed: FeedPost[] = [
  {
    id: "f1",
    providerId: "p1",
    image:
      "https://images.unsplash.com/photo-1565608438257-fac3c27beb36?w=900&q=80",
    caption: "Instalação elétrica completa concluída em Talatona ⚡",
    likes: 128,
    comments: 14,
    timeAgo: "2h",
  },
  {
    id: "f2",
    providerId: "p4",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80",
    caption: "Penteado pronto para o casamento deste fim-de-semana 💚",
    likes: 342,
    comments: 41,
    timeAgo: "5h",
  },
  {
    id: "f3",
    providerId: "p2",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80",
    caption: "Limpeza profunda em apartamento T3 — antes e depois 🧼",
    likes: 89,
    comments: 7,
    timeAgo: "1d",
  },
];
