
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarCheck, Upload, AlertCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
}

export default function AttendancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dateRange, setDateRange] = useState<string>('');
  const [editorName, setEditorName] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'text/csv'
      ) {
        setFile(selectedFile);
        // For now, let's just use mock data on file selection
        // The actual parsing logic will go here
        handleProcessFile(selectedFile);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid Excel file (.xls, .xlsx) or a CSV file.',
          variant: 'destructive',
        });
        setFile(null);
      }
    }
  };

  const handleProcessFile = (selectedFile: File) => {
    setIsProcessing(true);
    // Mock processing for a single editor
    setTimeout(() => {
      setDateRange('From: 2025-12-23 00:00:00 To: 2026-01-22 23:59:59');
      setEditorName('Editor One'); // Mock editor name
      setAttendanceData([
        { date: '23', checkIn: '7:37:58', checkOut: '17:49:30' },
        { date: '24', checkIn: '7:46:50', checkOut: '17:59:08' },
        { date: '25', checkIn: '', checkOut: '' }, // Example of a day off
        { date: '26', checkIn: '8:01:12', checkOut: '18:05:00' },
        { date: '27', checkIn: '7:55:00', checkOut: '18:10:00' },
        { date: '28', checkIn: '8:00:00', checkOut: '18:00:00' },
      ]);
      setIsProcessing(false);
      toast({
        title: 'File Processed',
        description: `Review the extracted attendance data for ${selectedFile.name}.`,
      });
    }, 1500);
  };
  
  const handleAttendanceChange = (recordIndex: number, field: 'checkIn' | 'checkOut', value: string) => {
      const updatedData = [...attendanceData];
      updatedData[recordIndex][field] = value;
      setAttendanceData(updatedData);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <CalendarCheck className="mr-3 h-8 w-8 text-primary" /> Editor Attendance Sheet
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload Attendance File</CardTitle>
          <CardDescription>
            Select an Excel (.xlsx, .xls) or CSV file for a single editor to upload for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="attendance-file">Attendance File</Label>
            <div className="flex gap-2 mt-2">
                <Input
                    id="attendance-file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".xlsx, .xls, .csv"
                    className="flex-grow"
                    disabled={isProcessing}
                />
                <Button onClick={() => file && handleProcessFile(file)} disabled={!file || isProcessing}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Processing...' : 'Review File'}
                </Button>
            </div>
             {file && <p className="text-sm text-muted-foreground mt-2">Selected file: {file.name}</p>}
          </div>
        </CardContent>
      </Card>
      
      {attendanceData.length > 0 && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Reviewing Attendance for: <span className="ml-2 font-bold text-primary">{editorName}</span></CardTitle>
                <CardDescription>
                    Review and edit the attendance data extracted from the file. Date Range: <span className="font-semibold">{dateRange}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-semibold w-[150px]">Entry</TableHead>
                                {attendanceData.map((rec, index) => (
                                    <TableHead key={index} className="text-center w-[150px]">{rec.date}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium bg-muted/50">Check-in</TableCell>
                                {attendanceData.map((rec, recordIndex) => (
                                    <TableCell key={`${recordIndex}-checkin`} className="p-1">
                                        <Input 
                                            type="text" 
                                            value={rec.checkIn}
                                            onChange={(e) => handleAttendanceChange(recordIndex, 'checkIn', e.target.value)}
                                            placeholder="--:--:--"
                                            className="h-8 text-center text-sm border-t-0 border-x-0 rounded-none border-b-2 border-b-transparent focus:border-b-primary focus:ring-0" 
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium bg-muted/50">Check-out</TableCell>
                                {attendanceData.map((rec, recordIndex) => (
                                    <TableCell key={`${recordIndex}-checkout`} className="p-1">
                                        <Input 
                                            type="text" 
                                            value={rec.checkOut} 
                                            onChange={(e) => handleAttendanceChange(recordIndex, 'checkOut', e.target.value)}
                                            placeholder="--:--:--"
                                            className="h-8 text-center text-sm border-t-0 border-x-0 rounded-none border-b-2 border-b-transparent focus:border-b-primary focus:ring-0" 
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                  </div>
                   <div className="flex justify-end mt-6">
                        <Button>Save Attendance</Button>
                    </div>
              </CardContent>
          </Card>
      )}

      {!file && !isProcessing && attendanceData.length === 0 && (
          <Card className="shadow-md text-center py-10">
          <CardContent>
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">Awaiting File</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please upload an attendance sheet to begin the review process.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
