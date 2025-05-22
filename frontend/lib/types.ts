export interface Item {
  id: string;
  name: string;
  category: string;
  quantity: number;
  checked: boolean;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  start_date: Date | null;
  end_date: Date | null;
  location: string;
  packing_list: Item[];
  created_at: Date;
  view_type?: 'card' | 'list';
} 