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

export interface Facility {
  id?: string;
  facility_id: string;
  lat: number;
  lon: number;
  name: string;
  description?: string;
  type?: string;
  reservation_url?: string;
  source?: string;
  phone?: string;
  email?: string;
  is_custom?: boolean;
  user_id?: string;
}

export interface TripLocation {
  id: string;
  trip_id: string;
  user_email: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Collaborator {
  id: string;
  trip_id: string;
  email: string;
  status: 'Pending' | 'Accepted';
  invited_at: string;
  is_owner?: boolean;
  user_id?: string;
}

export interface Campsite {
  id: string;
  facility_id: string;
  name: string;
  description?: string;
  reservation_url?: string;
  site_type?: string;
  max_occupancy?: number;
  amenities?: string[];
}

export interface Comment {
  id: string;
  trip_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
  user?: {
    email: string;
    id: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  trip_id: string;
  comment_id?: string;
  type: 'mention' | 'comment';
  seen: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: Date | null;
  end_date: Date | null;
  location: string;
  packing_list: Item[];
  notes?: any;
  created_at: Date;
  trip_type?: string;
  group_size?: number;
  duration?: number;
  experience_level?: string;
  facility_id?: string;
  facility?: Facility;
  collaborators?: Collaborator[];
  status?: string;
  locations?: TripLocation[];
} 