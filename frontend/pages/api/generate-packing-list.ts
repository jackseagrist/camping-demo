import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      tripType,
      groupSize,
      duration,
      location,
      month,
      experienceLevel,
      sustainability,
    } = await request.json();

    // Here you would typically call your existing Packing List API
    // For now, we'll return a sample packing list
    const packingList = {
      items: [
        "Tent",
        "Sleeping bag",
        "Sleeping pad",
        "Headlamp",
        "Water bottles",
        "First aid kit",
        "Multi-tool",
        "Matches/lighter",
        "Camp stove",
        "Cooking pot",
        "Utensils",
        "Food storage containers",
        "Hiking boots",
        "Rain jacket",
        "Warm layers",
        "Hat",
        "Sunscreen",
        "Insect repellent",
        "Map and compass",
        "Backpack",
      ],
    };

    return new Response(JSON.stringify(packingList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating packing list:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 