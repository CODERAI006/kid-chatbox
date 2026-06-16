/**
 * Study Library Content Management Component
 * CRUD operations for Study Library content (PPT, PDF, Text) with file uploads
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Text,
  Textarea,
  Select,
  useToast,
  Flex,
} from '@/shared/design-system';
import {
  studyLibraryContentApi,
  StudyLibraryContent,
  type StudyLibraryContentType,
} from '@/services/admin';
import { getErrorMessage } from '@/services/api';
import {
  StudyContentAudienceFields,
  STUDY_CONTENT_FILE_ACCEPT,
  STUDY_CONTENT_TYPES,
  STUDY_LIBRARY_MAX_FILE_BYTES,
} from './study/StudyContentAudienceFields';

interface StudyLibraryContentFormData {
  title: string;
  description: string;
  contentType: StudyLibraryContentType;
  textContent: string;
  subject: string;
  grade: string;
  isGeneral: boolean;
  ageGroup: string;
  difficulty: string;
  language: string;
  publishDate: string;
  isPublished: boolean;
}

/**
 * Study Library Content Management component
 */
export const StudyLibraryContentManagement: React.FC = () => {
  const [content, setContent] = useState<StudyLibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<StudyLibraryContent | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filters, setFilters] = useState({
    contentType: '',
    isPublished: '',
    subject: '',
    ageGroup: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const toast = useToast();

  const [formData, setFormData] = useState<StudyLibraryContentFormData>({
    title: '',
    description: '',
    contentType: 'pdf',
    textContent: '',
    subject: '',
    grade: '',
    isGeneral: false,
    ageGroup: '',
    difficulty: '',
    language: 'English',
    publishDate: '',
    isPublished: false,
  });

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await studyLibraryContentApi.getStudyLibraryContent({
        page: pagination.page,
        limit: pagination.limit,
        contentType: filters.contentType
          ? (filters.contentType as StudyLibraryContentType)
          : undefined,
        isPublished: filters.isPublished ? filters.isPublished === 'true' : undefined,
        subject: filters.subject || undefined,
        ageGroup: filters.ageGroup || undefined,
      });
      // Normalize content type field (handle both camelCase and snake_case)
      const normalizedContent = response.content.map((item) => {
        const contentType = (item.contentType || 
          (item as unknown as { content_type?: string }).content_type || 
          'text') as StudyLibraryContentType;
        return {
          ...item,
          contentType,
        };
      });
      setContent(normalizedContent);
      setPagination(response.pagination);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load study library content';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters.contentType, filters.isPublished, filters.subject, filters.ageGroup, pagination.page, pagination.limit]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleCreate = () => {
    setSelectedContent(null);
    setSelectedFile(null);
    setFormData({
      title: '',
      description: '',
      contentType: 'pdf',
      textContent: '',
      subject: '',
      grade: '',
      isGeneral: false,
      ageGroup: '',
      difficulty: '',
      language: 'English',
      publishDate: '',
      isPublished: false,
    });
    onOpen();
  };

  const handleEdit = (item: StudyLibraryContent) => {
    setSelectedContent(item);
    setSelectedFile(null);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      contentType: item.contentType || 'text',
      textContent: item.textContent || '',
      subject: item.subject || '',
      grade: item.grade || '',
      isGeneral: item.isGeneral || false,
      ageGroup: item.ageGroup || '',
      difficulty: item.difficulty || '',
      language: item.language || 'English',
      publishDate: item.publishDate ? item.publishDate.split('T')[0] : '',
      isPublished: item.isPublished || false,
    });
    onOpen();
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.contentType) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const needsFile = ['ppt', 'pdf', 'image', 'doc'].includes(formData.contentType);
    if (needsFile && !selectedFile && !selectedContent?.fileUrl) {
      toast({
        title: 'Validation Error',
        description: `Please upload a file for ${formData.contentType.toUpperCase()} content`,
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (formData.contentType === 'text' && !formData.textContent && !selectedFile && !selectedContent?.textContent) {
      toast({
        title: 'Validation Error',
        description: 'Please provide text content or upload a text file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setFormLoading(true);
      if (selectedContent) {
        await studyLibraryContentApi.updateStudyLibraryContent(selectedContent.id, formData, selectedFile || undefined);
        toast({
          title: 'Success',
          description: 'Content updated successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        await studyLibraryContentApi.createStudyLibraryContent(formData, selectedFile || undefined);
        toast({
          title: 'Success',
          description: 'Content created successfully',
          status: 'success',
          duration: 3000,
        });
      }
      onClose();
      setSelectedFile(null);
      loadContent();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      await studyLibraryContentApi.deleteStudyLibraryContent(deleteId);
      toast({
        title: 'Success',
        description: 'Content deleted successfully',
        status: 'success',
        duration: 3000,
      });
      onDeleteClose();
      setDeleteId(null);
      loadContent();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete content';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const maxUploadLabel = formatFileSize(STUDY_LIBRARY_MAX_FILE_BYTES);

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    if (file.size > STUDY_LIBRARY_MAX_FILE_BYTES) {
      toast({
        title: 'File too large',
        description: `${file.name} exceeds the ${maxUploadLabel} limit. Try a smaller image or compress it first.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setSelectedFile(file);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && content.length === 0) {
    return (
      <Box textAlign="center" padding={8}>
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box padding={{ base: 4, md: 6 }}>
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">
        <HStack justifyContent="space-between" flexWrap="wrap" spacing={{ base: 2, md: 4 }}>
          <Heading size={{ base: 'md', md: 'lg' }}>Study Library Content Management</Heading>
          <Button colorScheme="green" onClick={handleCreate} size={{ base: 'sm', md: 'md' }}>
            + Upload Content
          </Button>
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Box>
          <HStack spacing={3} flexWrap="wrap">
            <Select
              placeholder="Content Type"
              value={filters.contentType}
              onChange={(e) => handleFilterChange('contentType', e.target.value)}
              size={{ base: 'sm', md: 'md' }}
              w={{ base: '100%', sm: '150px' }}
            >
              <option value="">All Types</option>
              {STUDY_CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select
              placeholder="Status"
              value={filters.isPublished}
              onChange={(e) => handleFilterChange('isPublished', e.target.value)}
              size={{ base: 'sm', md: 'md' }}
              w={{ base: '100%', sm: '150px' }}
            >
              <option value="">All Status</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </Select>
            <Input
              placeholder="Filter by Subject"
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
              size={{ base: 'sm', md: 'md' }}
              w={{ base: '100%', sm: '200px' }}
            />
            <Button
              onClick={() => {
                setFilters({ contentType: '', isPublished: '', subject: '', ageGroup: '' });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              size={{ base: 'sm', md: 'md' }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </HStack>
        </Box>

        {/* Table */}
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Subject</Th>
                <Th>Grade</Th>
                <Th>File</Th>
                <Th>Publish Date</Th>
                <Th>Status</Th>
                <Th>Views</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {content.length === 0 ? (
                <Tr>
                  <Td colSpan={9} textAlign="center" py={8}>
                    <Text color="gray.500">No content found</Text>
                  </Td>
                </Tr>
              ) : (
                content.map((item) => (
                  <Tr key={item.id}>
                    <Td fontWeight="bold">{item.title}</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          item.contentType === 'pdf'
                            ? 'red'
                            : item.contentType === 'image'
                              ? 'purple'
                              : item.contentType === 'doc'
                                ? 'orange'
                                : item.contentType === 'ppt'
                                  ? 'blue'
                                  : 'green'
                        }
                      >
                        {(item.contentType || 'text').toUpperCase()}
                      </Badge>
                      {item.isGeneral && (
                        <Badge ml={1} colorScheme="teal">
                          General
                        </Badge>
                      )}
                    </Td>
                    <Td>{item.subject || (item.isGeneral ? 'General' : '-')}</Td>
                    <Td>{item.grade || (item.isGeneral ? 'All' : '-')}</Td>
                    <Td>
                      {item.fileName ? (
                        <Text fontSize="sm" isTruncated maxW="200px">
                          {item.fileName} ({formatFileSize(item.fileSize)})
                        </Text>
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          Text Content
                        </Text>
                      )}
                    </Td>
                    <Td>{formatDate(item.publishDate)}</Td>
                    <Td>
                      <Badge colorScheme={item.isPublished ? 'green' : 'gray'}>
                        {item.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </Td>
                    <Td>{item.viewCount || 0}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button size={{ base: 'xs', md: 'sm' }} onClick={() => handleEdit(item)}>
                          Edit
                        </Button>
                        <Button
                          size={{ base: 'xs', md: 'sm' }}
                          colorScheme="red"
                          variant="outline"
                          onClick={() => handleDeleteClick(item.id)}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Flex justify="center" align="center" gap={2}>
            <Button
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              isDisabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Text>
              Page {pagination.page} of {pagination.pages} (Total: {pagination.total})
            </Text>
            <Button
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              isDisabled={pagination.page === pagination.pages}
            >
              Next
            </Button>
          </Flex>
        )}

        {/* Create/Edit Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'xl' }} scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{selectedContent ? 'Edit Content' : 'Upload New Content'}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Title</FormLabel>
                  <Input
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter content title"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description"
                    rows={3}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Content Type</FormLabel>
                  <Select
                    value={formData.contentType || 'pdf'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contentType: e.target.value as StudyLibraryContentType,
                      })
                    }
                  >
                    {STUDY_CONTENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {formData.contentType !== 'text' && (
                  <FormControl isRequired={!selectedContent}>
                    <FormLabel>Upload File</FormLabel>
                    <Text fontSize="xs" color="gray.500" mb={2}>
                      Max file size: {maxUploadLabel}. Phone photos often exceed 1MB — if upload fails with 413, reload nginx config on the server.
                    </Text>
                    <Input
                      type="file"
                      accept={STUDY_CONTENT_FILE_ACCEPT[formData.contentType] || '*'}
                      onChange={(e) => {
                        handleFileSelected(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    {selectedContent?.fileName && !selectedFile && (
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Current file: {selectedContent.fileName}
                      </Text>
                    )}
                    {selectedFile && (
                      <Text fontSize="sm" color="green.500" mt={1}>
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </Text>
                    )}
                  </FormControl>
                )}

                {formData.contentType === 'text' && (
                  <FormControl>
                    <FormLabel>Text Content</FormLabel>
                    <Textarea
                      value={formData.textContent || ''}
                      onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                      placeholder="Enter text content or upload a text file below"
                      rows={6}
                    />
                    <Input
                      type="file"
                      accept=".txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > STUDY_LIBRARY_MAX_FILE_BYTES) {
                            toast({
                              title: 'File too large',
                              description: `${file.name} exceeds the ${maxUploadLabel} limit.`,
                              status: 'error',
                              duration: 5000,
                              isClosable: true,
                            });
                            e.target.value = '';
                            return;
                          }
                          setSelectedFile(file);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const text = event.target?.result as string;
                            setFormData({ ...formData, textContent: text });
                          };
                          reader.readAsText(file);
                        }
                      }}
                      mt={2}
                    />
                  </FormControl>
                )}

                <StudyContentAudienceFields
                  value={{
                    subject: formData.subject,
                    grade: formData.grade,
                    isGeneral: formData.isGeneral,
                  }}
                  onChange={(patch) => setFormData({ ...formData, ...patch })}
                />

                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel>Difficulty</FormLabel>
                    <Select
                      value={formData.difficulty || ''}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      placeholder="Select difficulty"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Language</FormLabel>
                    <Select
                      value={formData.language || 'English'}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Hinglish">Hinglish</option>
                    </Select>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel>Publish Date</FormLabel>
                  <Input
                    type="date"
                    value={formData.publishDate || ''}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <HStack>
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    />
                    <FormLabel mb={0}>Publish immediately</FormLabel>
                  </HStack>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter flexWrap="wrap">
              <Button variant="ghost" mr={3} onClick={onClose} w={{ base: '100%', sm: 'auto' }} mb={{ base: 2, sm: 0 }}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                isLoading={formLoading}
                w={{ base: '100%', sm: 'auto' }}
              >
                {selectedContent ? 'Update' : 'Create'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Delete Content</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text>Are you sure you want to delete this content? This action cannot be undone.</Text>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onDeleteClose} isDisabled={deleting}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} isLoading={deleting}>
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

