/**
 * API client for image comments
 */
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CommentAuthor {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface Comment {
  id: string;
  image_id: string;
  author: CommentAuthor;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
}

export interface CommentListResponse {
  comments: Comment[];
  total: number;
  image_id: string;
}

/**
 * Create a new comment on an image
 */
export async function createComment(
  imageId: string,
  content: string,
  token: string
): Promise<Comment> {
  const response = await axios.post(
    `${API_BASE}/api/v1/comments`,
    { image_id: imageId, content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

/**
 * Get all comments for an image
 */
export async function getCommentsForImage(
  imageId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CommentListResponse> {
  const response = await axios.get(
    `${API_BASE}/api/v1/comments/image/${imageId}`,
    { params: { limit, offset } }
  );
  return response.data;
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string,
  token: string
): Promise<Comment> {
  const response = await axios.put(
    `${API_BASE}/api/v1/comments/${commentId}`,
    { content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string,
  token: string
): Promise<void> {
  await axios.delete(
    `${API_BASE}/api/v1/comments/${commentId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/**
 * Get comment count for an image
 */
export async function getCommentCount(imageId: string): Promise<number> {
  const response = await axios.get(
    `${API_BASE}/api/v1/comments/image/${imageId}/count`
  );
  return response.data.count;
}

