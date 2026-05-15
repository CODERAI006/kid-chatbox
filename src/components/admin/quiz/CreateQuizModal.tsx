/**
 * Create Quiz Modal Component
 * Handles both AI generation and JSON/CSV upload
 */

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Radio,
  RadioGroup,
  Stack,
  Divider,
  Text,
  Tooltip,
  useToast,
} from '@/shared/design-system';
import { countLines, MAX_LINES } from './csvParsing';
import { downloadJSONTemplate, downloadCSVTemplate } from './fileTemplates';
import { AIQuizConfigForm, AIQuizConfigData } from './AIQuizConfigForm';

interface AIGenerateData extends AIQuizConfigData {
  topics: string[];
}

interface JSONUploadData {
  name: string;
  description: string;
  difficulty: string;
  passingPercentage: number;
  timeLimit: string;
  jsonContent?: string;
  uploadMethod?: 'text' | 'file';
  uploadedFile?: File | null;
}

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (type: 'ai' | 'json', data: AIGenerateData | JSONUploadData) => Promise<void>;
  loading: boolean;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [uploadMethod, setUploadMethod] = useState<'text' | 'file'>('file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [aiFormTouched, setAiFormTouched] = useState(false);
  const toast = useToast();

  const [aiFormData, setAiFormData] = useState<AIQuizConfigData>({
    name: '',
    description: '',
    difficulty: '',
    numberOfQuestions: 15,
    passingPercentage: 60,
    timeLimit: '',
    language: 'English',
    gradeLevel: '',
    sampleQuestion: '',
    examStyle: '',
    subject: '',
    questionType: '',
  });

  const [jsonFormData, setJsonFormData] = useState({
    name: '',
    description: '',
    difficulty: '',
    passingPercentage: 60,
    timeLimit: '',
    jsonContent: '',
  });

  const handleClose = () => {
    setUploadMethod('file');
    setUploadedFile(null);
    setAiFormTouched(false);
    setAiFormData({
      name: '',
      description: '',
      difficulty: '',
      numberOfQuestions: 15,
      passingPercentage: 60,
      timeLimit: '',
      language: 'English',
      gradeLevel: '',
      sampleQuestion: '',
      examStyle: '',
      subject: '',
      questionType: '',
    });
    setJsonFormData({
      name: '',
      description: '',
      difficulty: '',
      passingPercentage: 60,
      timeLimit: '',
      jsonContent: '',
    });
    onClose();
  };

  const isAIFormValid = Boolean(aiFormData.name.trim() && aiFormData.difficulty);

  const handleAIGenerate = async () => {
    if (!isAIFormValid) return;          // button is disabled; guard just in case
    await onCreate('ai', {
      topics: [],
      ...aiFormData,
    });
    handleClose();
  };

  const handleJSONUpload = async () => {
    if (!jsonFormData.name || !jsonFormData.difficulty) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (uploadMethod === 'text' && !jsonFormData.jsonContent?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide JSON content or upload a file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (uploadMethod === 'file' && !uploadedFile) {
      toast({
        title: 'Validation Error',
        description: 'Please upload a CSV or JSON file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    await onCreate('json', {
      uploadMethod,
      uploadedFile,
      ...jsonFormData,
    });
    handleClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const lineCount = countLines(content);
          
          if (lineCount > MAX_LINES) {
            toast({
              title: 'File Too Large',
              description: `File has ${lineCount} lines, which exceeds the maximum limit of ${MAX_LINES} lines. Please choose a file with fewer lines.`,
              status: 'error',
              duration: 5000,
            });
            e.target.value = '';
            setUploadedFile(null);
            return;
          }
          
          setUploadedFile(file);
        } catch (error) {
          toast({
            title: 'Error Reading File',
            description: 'Failed to read file. Please try again.',
            status: 'error',
            duration: 3000,
          });
          e.target.value = '';
          setUploadedFile(null);
        }
      };
      reader.onerror = () => {
        toast({
          title: 'Error Reading File',
          description: 'Failed to read file. Please try again.',
          status: 'error',
          duration: 3000,
        });
        e.target.value = '';
        setUploadedFile(null);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="90vw" maxH="90vh">
        <ModalHeader>Create Quiz</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>AI Generation</Tab>
              <Tab>JSON/CSV Upload</Tab>
            </TabList>
            <TabPanels>
              {/* AI Generation Tab */}
              <TabPanel>
                <AIQuizConfigForm
                  value={aiFormData}
                  onChange={(updates) => setAiFormData(prev => ({ ...prev, ...updates }))}
                  showErrors={aiFormTouched}
                />
              </TabPanel>

              {/* JSON/CSV Upload Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Quiz Name</FormLabel>
                    <Input
                      value={jsonFormData.name}
                      onChange={(e) => setJsonFormData({ ...jsonFormData, name: e.target.value })}
                      placeholder="Enter quiz name"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea
                      value={jsonFormData.description}
                      onChange={(e) => setJsonFormData({ ...jsonFormData, description: e.target.value })}
                      placeholder="Enter quiz description"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Difficulty</FormLabel>
                    <Select
                      value={jsonFormData.difficulty}
                      onChange={(e) => setJsonFormData({ ...jsonFormData, difficulty: e.target.value })}
                      placeholder="Select difficulty"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                      <option value="Mix">Mix</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Upload Method</FormLabel>
                    <RadioGroup value={uploadMethod} onChange={(value) => {
                      setUploadMethod(value as 'text' | 'file');
                      if (value === 'file') {
                        setJsonFormData({ ...jsonFormData, jsonContent: '' });
                      } else {
                        setUploadedFile(null);
                      }
                    }}>
                      <Stack direction="row" spacing={4}>
                        <Radio value="text">Enter manually (JSON)</Radio>
                        <Radio value="file">Upload CSV/JSON file</Radio>
                      </Stack>
                    </RadioGroup>
                  </FormControl>

                  <Divider />

                  {uploadMethod === 'file' ? (
                    <FormControl isRequired>
                      <FormLabel>Upload File (CSV or JSON)</FormLabel>
                      <Input
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileChange}
                      />
                      {uploadedFile && (
                        <VStack align="start" spacing={1} mt={2}>
                          <Text fontSize="sm" color="green.500">
                            ✓ File selected: {uploadedFile.name}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            Max {MAX_LINES} lines allowed
                          </Text>
                        </VStack>
                      )}
                      <HStack mt={2} spacing={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="blue"
                          onClick={downloadJSONTemplate}
                        >
                          📥 Download JSON Template
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="green"
                          onClick={downloadCSVTemplate}
                        >
                          📥 Download CSV Template
                        </Button>
                      </HStack>
                      <Text fontSize="sm" color="gray.500" mt={2}>
                        Supported formats: CSV or JSON (max {MAX_LINES} lines). CSV should have columns: question, optionA, optionB, optionC, optionD, correctAnswer, explanation, hint, questionType, points
                      </Text>
                    </FormControl>
                  ) : (
                    <FormControl isRequired>
                      <HStack justify="space-between" mb={2}>
                        <FormLabel mb={0}>JSON Questions</FormLabel>
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="blue"
                          onClick={downloadJSONTemplate}
                        >
                          📥 Download Template
                        </Button>
                      </HStack>
                      <Textarea
                        value={jsonFormData.jsonContent}
                        onChange={(e) => setJsonFormData({ ...jsonFormData, jsonContent: e.target.value })}
                        placeholder={`[\n  {\n    "question": "Question text",\n    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},\n    "correctAnswer": "A",\n    "explanation": "Explanation text"\n  }\n]`}
                        height="200px"
                        fontFamily="mono"
                      />
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Format: Array of question objects with question, options, correctAnswer, and explanation/justification (max {MAX_LINES} questions)
                      </Text>
                    </FormControl>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          {activeTab === 0 ? (
            <Tooltip
              isDisabled={isAIFormValid}
              label={
                !aiFormData.name.trim()
                  ? 'Enter a quiz name first'
                  : 'Select a difficulty level'
              }
              hasArrow
              placement="top"
            >
              {/* span needed so Tooltip fires on a disabled Button */}
              <span onClick={() => !isAIFormValid && setAiFormTouched(true)}>
                <Button
                  colorScheme="blue"
                  onClick={handleAIGenerate}
                  isLoading={loading}
                  isDisabled={!isAIFormValid}
                >
                  Generate with AI
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              colorScheme="blue"
              onClick={handleJSONUpload}
              isLoading={loading}
            >
              Upload Quiz (JSON/CSV)
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

