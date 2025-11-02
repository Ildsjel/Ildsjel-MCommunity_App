'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem
} from '@mui/material'
import {
  MoreVert,
  Edit,
  Delete,
  Send
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import RichTextEditor from './RichTextEditor'
import UserAvatar from './UserAvatar'
import { useUser } from '../context/UserContext'
import {
  Comment,
  createComment,
  getCommentsForImage,
  updateComment,
  deleteComment
} from '@/lib/commentApi'

interface ImageCommentsProps {
  imageId: string
  imageOwnerId?: string
}

export default function ImageComments({ imageId, imageOwnerId }: ImageCommentsProps) {
  const { user } = useUser()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)

  useEffect(() => {
    loadComments()
  }, [imageId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const response = await getCommentsForImage(imageId)
      setComments(response.comments)
      setError('')
    } catch (err: any) {
      setError('Failed to load comments')
      console.error('Load comments error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      setSubmitting(true)
      const comment = await createComment(imageId, newComment, token)
      setComments([comment, ...comments])
      setNewComment('')
      setError('')
    } catch (err: any) {
      setError('Failed to post comment')
      console.error('Create comment error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async () => {
    if (!editContent.trim() || !editingCommentId) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const updated = await updateComment(editingCommentId, editContent, token)
      setComments(comments.map(c => (c.id === updated.id ? updated : c)))
      setEditingCommentId(null)
      setEditContent('')
      setError('')
    } catch (err: any) {
      setError('Failed to update comment')
      console.error('Update comment error:', err)
    }
  }

  const handleDeleteComment = async () => {
    if (!commentToDelete) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      await deleteComment(commentToDelete, token)
      setComments(comments.filter(c => c.id !== commentToDelete))
      setDeleteDialogOpen(false)
      setCommentToDelete(null)
      setError('')
    } catch (err: any) {
      setError('Failed to delete comment')
      console.error('Delete comment error:', err)
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, commentId: string) => {
    setMenuAnchor(event.currentTarget)
    setSelectedCommentId(commentId)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedCommentId(null)
  }

  const startEdit = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditContent(comment.content)
    handleMenuClose()
  }

  const startDelete = (commentId: string) => {
    setCommentToDelete(commentId)
    setDeleteDialogOpen(true)
    handleMenuClose()
  }

  const canModifyComment = (comment: Comment): boolean => {
    if (!user) return false
    // Author can edit/delete, image owner can delete
    return comment.author.user_id === user.id || imageOwnerId === user.id
  }

  const canEditComment = (comment: Comment): boolean => {
    if (!user) return false
    // Only author can edit
    return comment.author.user_id === user.id
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* New Comment Form */}
      {user && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <UserAvatar
                userId={user.id}
                userName={user.username || user.handle}
                avatarUrl={user.avatar_url || user.profile_image_url}
                size={40}
              />
              <Box sx={{ flex: 1 }}>
                <RichTextEditor
                  value={newComment}
                  onChange={setNewComment}
                  placeholder="Write a comment..."
                  maxLength={5000}
                  minHeight="100px"
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Comments ({comments.length})
      </Typography>

      {comments.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No comments yet. Be the first to comment!
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <UserAvatar
                    userId={comment.author.user_id}
                    userName={comment.author.username}
                    avatarUrl={comment.author.avatar_url}
                    size={40}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {comment.author.display_name || comment.author.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          {comment.is_edited && ' (edited)'}
                        </Typography>
                      </Box>
                      {canModifyComment(comment) && (
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, comment.id)}
                        >
                          <MoreVert />
                        </IconButton>
                      )}
                    </Box>

                    {editingCommentId === comment.id ? (
                      <Box>
                        <RichTextEditor
                          value={editContent}
                          onChange={setEditContent}
                          placeholder="Edit your comment..."
                          maxLength={5000}
                          minHeight="100px"
                        />
                        <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingCommentId(null)
                              setEditContent('')
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={handleEditComment}
                            disabled={!editContent.trim()}
                          >
                            Save
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          '& p': { margin: 0 },
                          '& ul, & ol': { marginTop: 0, marginBottom: 0 }
                        }}
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                      />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedCommentId && canEditComment(comments.find(c => c.id === selectedCommentId)!) && (
          <MenuItem
            onClick={() => {
              const comment = comments.find(c => c.id === selectedCommentId)
              if (comment) startEdit(comment)
            }}
          >
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
        )}
        {selectedCommentId && (
          <MenuItem onClick={() => startDelete(selectedCommentId)}>
            <Delete sx={{ mr: 1 }} fontSize="small" />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Comment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this comment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteComment} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

