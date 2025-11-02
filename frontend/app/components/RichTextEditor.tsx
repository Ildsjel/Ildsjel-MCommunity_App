'use client'

import { useState, useRef, useEffect } from 'react'
import { Box, IconButton, Paper, Tooltip } from '@mui/material'
import { EmojiEmotions } from '@mui/icons-material'
import dynamic from 'next/dynamic'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import 'react-quill/dist/quill.snow.css'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  minHeight?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write a comment...',
  maxLength = 5000,
  minHeight = '150px'
}: RichTextEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const quillRef = useRef<any>(null)

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor()
      const cursorPosition = editor.getSelection()?.index || 0
      editor.insertText(cursorPosition, emojiData.emoji)
      editor.setSelection(cursorPosition + emojiData.emoji.length)
    }
    setShowEmojiPicker(false)
  }

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean']
    ]
  }

  const formats = [
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'code-block',
    'list',
    'bullet',
    'link'
  ]

  return (
    <Box sx={{ position: 'relative' }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          '& .quill': {
            minHeight: minHeight
          },
          '& .ql-container': {
            minHeight: minHeight,
            fontSize: '14px',
            fontFamily: 'inherit'
          },
          '& .ql-editor': {
            minHeight: minHeight
          },
          '& .ql-toolbar': {
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper'
          }
        }}
      >
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </Paper>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1,
          px: 1
        }}
      >
        <Tooltip title="Add emoji">
          <IconButton
            size="small"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            sx={{ color: 'text.secondary' }}
          >
            <EmojiEmotions />
          </IconButton>
        </Tooltip>

        <Box sx={{ fontSize: '12px', color: 'text.secondary' }}>
          {value.replace(/<[^>]*>/g, '').length} / {maxLength} characters
        </Box>
      </Box>

      {showEmojiPicker && (
        <Box
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            zIndex: 1000,
            mb: 1
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width={350}
            height={400}
          />
        </Box>
      )}
    </Box>
  )
}

