import axios from 'axios';

const COOLIFY_API_URL = import.meta.env.VITE_COOLIFY_API_URL || 'http://localhost:8000/api/v1';
const API_TOKEN = import.meta.env.VITE_COOLIFY_API_TOKEN;

if (!API_TOKEN) {
  console.warn('VITE_COOLIFY_API_TOKEN is not set. Coolify API calls will fail.');
}

const coolify = axios.create({
  baseURL: COOLIFY_API_URL,
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

export const getProjects = async () => {
  try {
    const response = await coolify.get('/projects');
    return response.data;
  } catch (error) {
    console.error('Error fetching Coolify projects:', error);
    throw error;
  }
};

export const createResource = async (data: any) => {
  try {
    const response = await coolify.post('/resources', data);
    return response.data;
  } catch (error) {
    console.error('Error creating resource in Coolify:', error);
    throw error;
  }
};

export default coolify;
