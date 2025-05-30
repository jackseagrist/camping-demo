export interface Item {
  id: string;
  name: string;
  category: string;
  quantity: number;
  checked: boolean;
}

export interface NoteItem {
  id: string;
  content: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  start_date: Date | null;
  end_date: Date | null;
  location: string;
  packing_list: Item[];
  notes?: NoteItem[];
  created_at: Date;
  trip_type?: string;
  group_size?: number;
  duration?: number;
  experience_level?: string;
} 