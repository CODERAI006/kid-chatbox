/**
 * BulkExamUpload — Upload up to 50 exams at once from a single Excel file.
 * All exam settings (Class, Subject, Difficulty, Pass %, Time Limit) are read
 * directly from the Excel file. No manual UI intervention required after upload.
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Box, VStack, HStack, Heading, Text, Button, Alert, AlertIcon, AlertDescription,
  Badge, Table, Thead, Tbody, Tr, Th, Td, Accordion, AccordionItem,
  AccordionButton, AccordionPanel, AccordionIcon, useToast, Spinner, Progress,
  Divider, Tooltip,
} from '@/shared/design-system';
import {
  parseWorkbook, downloadBulkTemplate,
  MAX_EXAMS, MAX_QUESTIONS_PER_EXAM,
  type ParsedExam,
} from './bulkExamUtils';

interface BulkExamUploadProps {
  onUploadComplete?: (results: { created: number; failed: number }) => void;
}

const DIFF_COLOR: Record<string, string> = {
  Expert: 'red', Advanced: 'orange', Mix: 'purple', Basic: 'green',
};

export const BulkExamUpload: React.FC<BulkExamUploadProps> = ({ onUploadComplete }) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedExams, setParsedExams] = useState<ParsedExam[]>([]);
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [done, setDone]             = useState<{ created: number; failed: number } | null>(null);

  /* ── File parsing ──────────────────────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({ title: 'Invalid file', description: 'Please upload an .xlsx or .xls file', status: 'error', duration: 3000 });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data  = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb    = XLSX.read(data, { type: 'array' });
        const exams = parseWorkbook(wb);

        if (exams.length === 0) {
          toast({ title: 'No exams found', description: 'Each sheet tab becomes one exam.', status: 'warning', duration: 4000 });
          return;
        }

        setParsedExams(exams);
        setDone(null);
        toast({ title: `${exams.length} exam(s) parsed`, description: 'Review below then click Upload All.', status: 'success', duration: 3000 });
      } catch (err) {
        toast({ title: 'Parse error', description: String((err as Error).message), status: 'error', duration: 4000 });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  /* ── Upload ────────────────────────────────────────────────────────────── */
  const handleUploadAll = async () => {
    const ready = parsedExams.filter((e) => e.questions.length > 0);
    if (ready.length === 0) {
      toast({ title: 'No valid exams to upload', status: 'warning', duration: 3000 });
      return;
    }

    const missing = ready.filter((e) => !e.name || !e.difficulty);
    if (missing.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `${missing.length} exam(s) are missing ExamName or Difficulty in the Excel metadata row.`,
        status: 'error', duration: 5000,
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    let created = 0, failed = 0;

    const token   = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, '')
      : `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || '3001'}/api`;
    const url = baseUrl.endsWith('/api')
      ? `${baseUrl}/bulk-exam-upload/single`
      : `${baseUrl}/api/bulk-exam-upload/single`;

    for (let i = 0; i < ready.length; i++) {
      const exam = ready[i];
      try {
        const payload = {
          name:              exam.name,
          description:       exam.description,
          gradeLevel:        exam.gradeLevel || null,
          subject:           exam.subject || null,
          difficulty:        exam.difficulty,
          passingPercentage: exam.passingPercentage,
          timeLimit:         exam.timeLimit || null,
          questions: exam.questions.map((q) => ({
            question:      q.question,
            options:       { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
            correctAnswer: q.correctAnswer,
            explanation:   q.explanation,
            hint:          q.hint,
            points:        q.points,
          })),
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (res.ok) { created++; }
        else { const b = await res.json().catch(() => ({})); console.error(`Failed: "${exam.name}"`, b); failed++; }
      } catch (err) {
        console.error(`Error uploading "${exam.name}":`, err);
        failed++;
      }
      setProgress(Math.round(((i + 1) / ready.length) * 100));
    }

    setUploading(false);
    setDone({ created, failed });
    onUploadComplete?.({ created, failed });
    toast({
      title: 'Upload complete',
      description: `✅ ${created} exam(s) created${failed > 0 ? ` · ❌ ${failed} failed` : ''}`,
      status: failed > 0 ? 'warning' : 'success', duration: 6000,
    });
  };

  /* ── Render ────────────────────────────────────────────────────────────── */
  const totalQs  = parsedExams.reduce((s, e) => s + e.questions.length, 0);
  const totalErr = parsedExams.reduce((s, e) => s + e.errors.length, 0);

  return (
    <Box>
      <VStack spacing={5} align="stretch">

        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <Box>
            <Heading size="sm" color="gray.700">📊 Bulk Excel Upload</Heading>
            <Text fontSize="sm" color="gray.500" mt={0.5}>
              Upload up to {MAX_EXAMS} exams at once. Settings are read from the Excel file — no manual input needed.
            </Text>
          </Box>
          <Button size="sm" colorScheme="green" variant="outline" leftIcon={<Text>📥</Text>} onClick={downloadBulkTemplate}>
            Download Template
          </Button>
        </HStack>

        <Divider />

        {/* Drop zone */}
        <Box
          border="2px dashed" borderColor="blue.300" borderRadius="lg" p={8}
          textAlign="center" bg="blue.50" cursor="pointer"
          _hover={{ bg: 'blue.100', borderColor: 'blue.400' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Text fontSize="3xl" mb={2}>📂</Text>
          <Text fontWeight="semibold" color="blue.700">Click to select Excel file (.xlsx / .xls)</Text>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Each sheet tab = one exam · max {MAX_EXAMS} exams · {MAX_QUESTIONS_PER_EXAM} questions per exam
          </Text>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
        </Box>

        {/* Summary + Upload button */}
        {parsedExams.length > 0 && (
          <HStack p={3} bg="white" border="1px" borderColor="gray.200" borderRadius="md"
            justify="space-between" flexWrap="wrap" gap={2}>
            <HStack spacing={3}>
              <Badge colorScheme="blue" fontSize="sm" px={3} py={1} borderRadius="full">{parsedExams.length} Exams</Badge>
              <Badge colorScheme="green" fontSize="sm" px={3} py={1} borderRadius="full">{totalQs} Questions</Badge>
              {totalErr > 0 && (
                <Badge colorScheme="red" fontSize="sm" px={3} py={1} borderRadius="full">{totalErr} Warning{totalErr !== 1 ? 's' : ''}</Badge>
              )}
            </HStack>
            <Button colorScheme="blue" size="md" isLoading={uploading}
              loadingText={`Uploading… ${progress}%`} onClick={handleUploadAll}
              leftIcon={uploading ? <Spinner size="xs" /> : <Text>🚀</Text>}>
              Upload All {parsedExams.length} Exam{parsedExams.length !== 1 ? 's' : ''}
            </Button>
          </HStack>
        )}

        {/* Progress */}
        {uploading && (
          <Box>
            <Text fontSize="sm" color="gray.600" mb={1}>Uploading… {progress}%</Text>
            <Progress value={progress} colorScheme="blue" borderRadius="md" hasStripe isAnimated />
          </Box>
        )}

        {/* Result */}
        {done && (
          <Alert status={done.failed > 0 ? 'warning' : 'success'} borderRadius="md">
            <AlertIcon />
            <AlertDescription>
              <strong>Upload complete:</strong> {done.created} exam{done.created !== 1 ? 's' : ''} created
              {done.failed > 0 && `, ${done.failed} failed`}.
              {done.failed === 0 && ' All exams are now available in the quiz library.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Parsed exam preview — read-only */}
        {parsedExams.length > 0 && (
          <Box>
            <Heading size="xs" color="gray.600" mb={2}>📋 Parsed Preview ({parsedExams.length})</Heading>
            <Accordion allowMultiple>
              {parsedExams.map((exam, idx) => (
                <AccordionItem key={idx}
                  border="1px" borderColor={exam.errors.length > 0 ? 'orange.200' : 'gray.200'}
                  borderRadius="md" mb={2} overflow="hidden">

                  <AccordionButton bg={exam.questions.length === 0 ? 'red.50' : 'white'} _hover={{ bg: 'gray.50' }} py={3}>
                    <HStack flex={1} spacing={2} flexWrap="wrap" gap={1}>
                      <Text fontWeight="semibold" fontSize="sm">{idx + 1}. {exam.name}</Text>
                      <Badge colorScheme="blue" fontSize="xs">{exam.questions.length} Qs</Badge>
                      {exam.gradeLevel && <Badge colorScheme="cyan" fontSize="xs">{exam.gradeLevel}</Badge>}
                      {exam.subject    && <Badge colorScheme="teal" fontSize="xs">{exam.subject}</Badge>}
                      {exam.difficulty && (
                        <Badge colorScheme={DIFF_COLOR[exam.difficulty] || 'gray'} fontSize="xs">{exam.difficulty}</Badge>
                      )}
                      {exam.passingPercentage && <Badge colorScheme="gray" fontSize="xs">Pass {exam.passingPercentage}%</Badge>}
                      {exam.timeLimit && <Badge colorScheme="gray" fontSize="xs">⏱ {exam.timeLimit} min</Badge>}
                      {exam.errors.length > 0 && (
                        <Tooltip label={exam.errors.join(' | ')}>
                          <Badge colorScheme="orange" fontSize="xs">⚠ {exam.errors.length} warning{exam.errors.length !== 1 ? 's' : ''}</Badge>
                        </Tooltip>
                      )}
                      {exam.questions.length === 0 && <Badge colorScheme="red" fontSize="xs">No questions — skipped</Badge>}
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>

                  <AccordionPanel pb={4} bg="gray.50">
                    <VStack spacing={3} align="stretch">
                      {exam.errors.length > 0 && (
                        <Alert status="warning" py={2} borderRadius="md">
                          <AlertIcon />
                          <VStack align="start" spacing={0}>
                            {exam.errors.map((err, ei) => <Text key={ei} fontSize="xs">{err}</Text>)}
                          </VStack>
                        </Alert>
                      )}

                      {exam.questions.length > 0 && (
                        <Box overflowX="auto" maxH="280px" overflowY="auto">
                          <Table size="sm" variant="simple">
                            <Thead bg="gray.100" position="sticky" top={0} zIndex={1}>
                              <Tr>
                                <Th w="36px">#</Th>
                                <Th>Question</Th>
                                <Th>A</Th><Th>B</Th><Th>C</Th><Th>D</Th>
                                <Th>✓</Th>
                                <Th>Pts</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {exam.questions.map((q, qi) => (
                                <Tr key={qi} _hover={{ bg: 'blue.50' }}>
                                  <Td color="gray.500" fontSize="xs">{qi + 1}</Td>
                                  <Td maxW="200px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                                    <Tooltip label={q.question}><Text fontSize="xs">{q.question}</Text></Tooltip>
                                  </Td>
                                  {[q.optionA, q.optionB, q.optionC, q.optionD].map((opt, oi) => (
                                    <Td key={oi} fontSize="xs" maxW="90px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{opt}</Td>
                                  ))}
                                  <Td><Badge colorScheme="green" fontSize="xs">{q.correctAnswer}</Badge></Td>
                                  <Td fontSize="xs">{q.points}</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      )}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </Box>
        )}

        {/* Format guide */}
        {parsedExams.length === 0 && (
          <Box p={4} bg="gray.50" border="1px" borderColor="gray.200" borderRadius="md">
            <Heading size="xs" color="gray.600" mb={3}>📌 Excel File Format — All Settings in the File</Heading>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" color="gray.700" fontWeight="semibold">Each sheet tab = one exam. The first 2 rows define exam settings:</Text>
              <Box overflowX="auto" w="full">
                <Table size="sm" variant="simple" bg="white" borderRadius="md">
                  <Thead bg="blue.50">
                    <Tr>
                      <Th fontSize="xs">Row</Th>
                      <Th fontSize="xs">ExamName</Th>
                      <Th fontSize="xs">Class</Th>
                      <Th fontSize="xs">Subject</Th>
                      <Th fontSize="xs">Difficulty</Th>
                      <Th fontSize="xs">PassPercentage</Th>
                      <Th fontSize="xs">TimeLimit(mins)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td fontSize="xs" color="gray.500">Row 1</Td>
                      <Td fontSize="xs" fontStyle="italic" color="blue.600">ExamName</Td>
                      <Td fontSize="xs" fontStyle="italic" color="blue.600">Class</Td>
                      <Td fontSize="xs" fontStyle="italic" color="blue.600">Subject</Td>
                      <Td fontSize="xs" fontStyle="italic" color="blue.600">Difficulty</Td>
                      <Td fontSize="xs" fontStyle="italic" color="blue.600">PassPercentage</Td>
                      <Td fontSize="xs" fontStyle="italic" color="blue.600">TimeLimit(mins)</Td>
                    </Tr>
                    <Tr>
                      <Td fontSize="xs" color="gray.500">Row 2</Td>
                      <Td fontSize="xs">Math Quiz Gr.3</Td>
                      <Td fontSize="xs">Class 3</Td>
                      <Td fontSize="xs">Maths</Td>
                      <Td fontSize="xs">Basic</Td>
                      <Td fontSize="xs">60</Td>
                      <Td fontSize="xs">30</Td>
                    </Tr>
                    <Tr bg="yellow.50">
                      <Td fontSize="xs" color="gray.500">Row 3</Td>
                      <Td colSpan={6} fontSize="xs" color="gray.400" fontStyle="italic">(leave blank — separator)</Td>
                    </Tr>
                    <Tr>
                      <Td fontSize="xs" color="gray.500">Row 4</Td>
                      <Td colSpan={6} fontSize="xs" fontStyle="italic" color="green.700">question | optionA | optionB | optionC | optionD | correctAnswer | explanation | hint | points</Td>
                    </Tr>
                    <Tr>
                      <Td fontSize="xs" color="gray.500">Row 5+</Td>
                      <Td colSpan={6} fontSize="xs">Actual question rows…</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
              <Text fontSize="xs" color="gray.500">
                Difficulty options: <strong>Basic</strong> · <strong>Advanced</strong> · <strong>Expert</strong> · <strong>Mix</strong> &nbsp;|&nbsp;
                Max <strong>{MAX_EXAMS} sheets</strong> per file · Max <strong>{MAX_QUESTIONS_PER_EXAM} questions</strong> per sheet
              </Text>
              <Text fontSize="xs" color="blue.600" fontWeight="medium">
                👆 Download the template above — it has two fully-filled example sheets.
              </Text>
            </VStack>
          </Box>
        )}

      </VStack>
    </Box>
  );
};

export default BulkExamUpload;
