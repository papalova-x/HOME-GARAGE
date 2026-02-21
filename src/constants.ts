import { Bike, Gauge, Zap, Shield, Info } from 'lucide-react';

export type Category = 'Yamaha' | 'Suzuki' | 'Honda' | 'Piaggio';

export interface Motorcycle {
  id: string;
  name: string;
  category: Category;
  image: string;
  specs: {
    engine: string;
    power: string;
    torque: string;
    weight: string;
    topSpeed: string;
  };
  modifications: string;
  description: string;
  year: number;
}

export const MOTORCYCLES: Motorcycle[] = [];
