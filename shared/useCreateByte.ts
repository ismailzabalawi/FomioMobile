import { useState, useCallback } from 'react';
import { discourseApi } from './discourseApi';
import { logger } from './logger';

export interface CreateByteData {
  title: string;
  content: string;
  category?: string | number; // Can be category slug or ID
  tags?: string[];
  isPrivate?: boolean;
  isPinned?: boolean;
  isClosed?: boolean;
}

export interface CreateByteState {
  isCreating: boolean;
  hasError: boolean;
  errorMessage?: string;
  successMessage?: string;
  createdByteId?: number;
}

export interface CreateByteResult {
  success: boolean;
  byteId?: number;
  error?: string;
}

export function useCreateByte() {
  const [state, setState] = useState<CreateByteState>({
    isCreating: false,
    hasError: false,
  });

  const validateByteData = useCallback((data: CreateByteData): string[] => {
    const errors: string[] = [];

    // Validate title
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (data.title.length < 5) {
      errors.push('Title must be at least 5 characters long');
    } else if (data.title.length > 255) {
      errors.push('Title must be less than 255 characters');
    }

    // Validate content
    if (!data.content || data.content.trim().length === 0) {
      errors.push('Content is required');
    } else if (data.content.length < 10) {
      errors.push('Content must be at least 10 characters long');
    } else if (data.content.length > 50000) {
      errors.push('Content must be less than 50,000 characters');
    }

    // Validate category (hub) - optional but if provided, should be valid
    if (data.category !== undefined && data.category !== null) {
      if (typeof data.category === 'string' && data.category.trim().length === 0) {
        errors.push('Category cannot be empty if provided');
      }
    }

    // Validate tags
    if (data.tags && data.tags.length > 5) {
      errors.push('Maximum 5 tags allowed');
    }

    // Validate tag length
    if (data.tags) {
      for (const tag of data.tags) {
        if (tag.length > 20) {
          errors.push('Tags must be less than 20 characters');
          break;
        }
      }
    }

    return errors;
  }, []);

  const createByte = useCallback(async (data: CreateByteData): Promise<CreateByteResult> => {
    try {
      // Reset state
      setState({
        isCreating: true,
        hasError: false,
        errorMessage: undefined,
        successMessage: undefined,
        createdByteId: undefined,
      });

      // Validate input data
      const validationErrors = validateByteData(data);
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.join(', ');
        setState(prev => ({
          ...prev,
          isCreating: false,
          hasError: true,
          errorMessage,
        }));
        return { success: false, error: errorMessage };
      }

      // Check if user is authenticated
      if (!discourseApi.isAuthenticated()) {
        const errorMessage = 'You must be logged in to create posts';
        setState(prev => ({
          ...prev,
          isCreating: false,
          hasError: true,
          errorMessage,
        }));
        return { success: false, error: errorMessage };
      }

      // Prepare the post data according to Discourse API structure
      const postData = {
        title: data.title.trim(),
        raw: data.content.trim(),
        category: data.category ? Number(data.category) : undefined, // Convert to number for Discourse API
        tags: data.tags || [],
        archetype: data.isPrivate ? 'private_message' : 'regular',
        pinned_globally: data.isPinned || false,
        closed: data.isClosed || false,
      };

      logger.debug('Creating byte', {
        title: postData.title,
        category: postData.category,
        categoryType: typeof postData.category,
        tags: postData.tags,
        archetype: postData.archetype
      });

      // Create the topic/post using Discourse API
      const response = await discourseApi.createTopic(postData);

      if (!response.success) {
        console.error('❌ Failed to create byte:', response.error);
        throw new Error(response.error || 'Failed to create post');
      }

      // Handle Discourse API response structure
      const responseData = response.data;
      let byteId: number;

      // Discourse API returns different structures based on the endpoint
      if (responseData.topic_id) {
        byteId = responseData.topic_id;
      } else if (responseData.id) {
        byteId = responseData.id;
      } else if (responseData.topic && responseData.topic.id) {
        byteId = responseData.topic.id;
      } else {
        console.error('❌ Unexpected response structure:', responseData);
        throw new Error('Unexpected response structure from Discourse API');
      }

      logger.debug('Byte created successfully', { byteId });

      setState({
        isCreating: false,
        hasError: false,
        successMessage: 'Post created successfully!',
        createdByteId: byteId,
      });

      logger.info('Byte created successfully', { 
        byteId, 
        title: data.title,
        category: data.category,
        responseData: responseData
      });

      return { success: true, byteId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post';
      
      console.error('🚨 Error creating byte:', error);
      logger.error('Failed to create byte', error);
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        hasError: true,
        errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }, [validateByteData]);

  const createReply = useCallback(async (
    topicId: number,
    content: string,
    replyToPostNumber?: number
  ): Promise<CreateByteResult> => {
    try {
      setState(prev => ({
        ...prev,
        isCreating: true,
        hasError: false,
        errorMessage: undefined,
        successMessage: undefined,
      }));

      // Validate content
      if (!content || content.trim().length === 0) {
        const errorMessage = 'Reply content is required';
        setState(prev => ({
          ...prev,
          isCreating: false,
          hasError: true,
          errorMessage,
        }));
        return { success: false, error: errorMessage };
      }

      if (content.length < 2) {
        const errorMessage = 'Reply must be at least 2 characters long';
        setState(prev => ({
          ...prev,
          isCreating: false,
          hasError: true,
          errorMessage,
        }));
        return { success: false, error: errorMessage };
      }

      // Check if user is authenticated
      if (!discourseApi.isAuthenticated()) {
        const errorMessage = 'You must be logged in to create replies';
        setState(prev => ({
          ...prev,
          isCreating: false,
          hasError: true,
          errorMessage,
        }));
        return { success: false, error: errorMessage };
      }

      // Prepare reply data according to Discourse API structure
      const replyData = {
        raw: content.trim(),
        topic_id: topicId,
        reply_to_post_number: replyToPostNumber,
      };

      logger.debug('Creating reply', {
        topicId,
        contentLength: content.length,
        replyToPostNumber
      });

      // Create the reply using Discourse API
      const response = await discourseApi.createPost(replyData);

      if (!response.success) {
        console.error('❌ Failed to create reply:', response.error);
        throw new Error(response.error || 'Failed to create reply');
      }

      // Handle Discourse API response structure
      const responseData = response.data;
      let postId: number;

      // Discourse API returns different structures based on the endpoint
      if (responseData.post_id) {
        postId = responseData.post_id;
      } else if (responseData.id) {
        postId = responseData.id;
      } else if (responseData.post && responseData.post.id) {
        postId = responseData.post.id;
      } else {
        console.error('❌ Unexpected response structure:', responseData);
        throw new Error('Unexpected response structure from Discourse API');
      }

      logger.debug('Reply created successfully', { postId });

      setState({
        isCreating: false,
        hasError: false,
        successMessage: 'Reply posted successfully!',
        createdByteId: postId,
      });

      logger.info('Reply created successfully', { 
        postId, 
        topicId,
        responseData: responseData
      });

      return { success: true, byteId: postId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reply';
      
      console.error('🚨 Error creating reply:', error);
      logger.error('Failed to create reply', error);
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        hasError: true,
        errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }, []);

  const clearState = useCallback(() => {
    setState({
      isCreating: false,
      hasError: false,
      errorMessage: undefined,
      successMessage: undefined,
      createdByteId: undefined,
    });
  }, []);

  const retry = useCallback(() => {
    if (state.hasError) {
      setState(prev => ({
        ...prev,
        hasError: false,
        errorMessage: undefined,
      }));
    }
  }, [state.hasError]);

  return {
    ...state,
    createByte,
    createReply,
    clearState,
    retry,
    validateByteData,
  };
}

