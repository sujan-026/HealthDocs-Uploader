import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Database, UserPlus, FileText, Stethoscope, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast, Toaster } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import {
  addMedicalRecord,
  getDocsInCollection,
  updatePatient,
  addConsultation,
} from "@/services/firestoreService";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface MedicalRecordForm {
  patientId: string;
  doctorId: string;
  allergies: string;
  consultationId: string;
}

interface PatientUpdateForm {
  patientId: string;
  age: number;
  weight: number;
  height?: number;
  bloodGroup?: string;
  emergencyContact?: string;
}

interface ConsultationForm {
  patientId: string;
  doctorId: string;
  notes: string;
  date?: string;
}

export default function Entry() {
  const [records, setRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'medical' | 'patient' | 'consultation'>('medical');

  const medicalForm = useForm<MedicalRecordForm>();
  const patientForm = useForm<PatientUpdateForm>();
  const consultationForm = useForm<ConsultationForm>();

  // Load existing medical records
  useEffect(() => {
    loadMedicalRecords();
  }, []);

  const loadMedicalRecords = async () => {
    try {
      const docs = await getDocsInCollection("MedicalRecords", "", "", "");
      setRecords(docs);
    } catch (error) {
      console.error("Error loading records:", error);
      toast.error("Failed to load medical records");
    }
  };

  // Handle Medical Record Creation
  const handleAddMedicalRecord = async (data: MedicalRecordForm) => {
    try {
      const allergiesArray = data.allergies
        .split(',')
        .map(allergy => allergy.trim())
        .filter(allergy => allergy.length > 0);

      const recordData: any = {
        patientId: data.patientId,
        doctorId: data.doctorId,
        allergies: allergiesArray,
      };

      // Only add consultationsRef if consultationId is provided
      if (data.consultationId && data.consultationId.trim()) {
        recordData.consultationsRef = doc(db, "Consultation", data.consultationId.trim());
      }

      const id = await addMedicalRecord(recordData);

      console.log("New MedicalRecord id:", id);
      toast.success(`Medical record created successfully! ID: ${id}`);
      medicalForm.reset();
      loadMedicalRecords(); // Refresh the list
    } catch (error) {
      console.error("Error creating medical record:", error);
      toast.error("Failed to create medical record");
    }
  };

  // Handle Patient Update
  const handleUpdatePatient = async (data: PatientUpdateForm) => {
    try {
      const updateData: any = {
        age: data.age,
        weight: data.weight,
      };

      if (data.height) updateData.height = data.height;
      if (data.bloodGroup) updateData.bloodGroup = data.bloodGroup;
      if (data.emergencyContact) updateData.emergencyContact = data.emergencyContact;

      await updatePatient(data.patientId, updateData);
      
      console.log("Patient updated:", data.patientId);
      toast.success(`Patient ${data.patientId} updated successfully!`);
      patientForm.reset();
    } catch (error) {
      console.error("Error updating patient:", error);
      toast.error("Failed to update patient");
    }
  };

  // Handle Consultation Creation
  const handleAddConsultation = async (data: ConsultationForm) => {
    try {
      const consultationData: any = {
        patientId: data.patientId,
        doctorId: data.doctorId,
        notes: data.notes,
      };

      if (data.date) {
        consultationData.date = new Date(data.date);
      }

      const id = await addConsultation(consultationData);
      
      console.log("New Consultation id:", id);
      toast.success(`Consultation created successfully! ID: ${id}`);
      consultationForm.reset();
    } catch (error) {
      console.error("Error creating consultation:", error);
      toast.error("Failed to create consultation");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Data Entry Portal</h1>
                <p className="text-sm text-muted-foreground">Manage medical records, patients, and consultations</p>
              </div>
            </div>
            
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Upload
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === 'medical' ? 'default' : 'outline'}
            onClick={() => setActiveTab('medical')}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Medical Records
          </Button>
          <Button
            variant={activeTab === 'patient' ? 'default' : 'outline'}
            onClick={() => setActiveTab('patient')}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Update Patient
          </Button>
          <Button
            variant={activeTab === 'consultation' ? 'default' : 'outline'}
            onClick={() => setActiveTab('consultation')}
            className="flex items-center gap-2"
          >
            <Stethoscope className="w-4 h-4" />
            Add Consultation
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Forms Section */}
          <div className="space-y-6">
            {/* Medical Record Form */}
            {activeTab === 'medical' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Medical Record
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={medicalForm.handleSubmit(handleAddMedicalRecord)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientId">Patient ID</Label>
                      <Input
                        id="patientId"
                        placeholder="123xyz123"
                        {...medicalForm.register('patientId', { required: 'Patient ID is required' })}
                      />
                      {medicalForm.formState.errors.patientId && (
                        <p className="text-sm text-destructive">{medicalForm.formState.errors.patientId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doctorId">Doctor ID</Label>
                      <Input
                        id="doctorId"
                        placeholder="123docx123"
                        {...medicalForm.register('doctorId', { required: 'Doctor ID is required' })}
                      />
                      {medicalForm.formState.errors.doctorId && (
                        <p className="text-sm text-destructive">{medicalForm.formState.errors.doctorId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                      <Input
                        id="allergies"
                        placeholder="Apple, Mango, Peanuts"
                        {...medicalForm.register('allergies')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consultationId">Consultation ID (optional)</Label>
                      <Input
                        id="consultationId"
                        placeholder="V2or4muGbE24yrWmrgwk"
                        {...medicalForm.register('consultationId')}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Create Medical Record
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Patient Update Form */}
            {activeTab === 'patient' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Update Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={patientForm.handleSubmit(handleUpdatePatient)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientId">Patient ID</Label>
                      <Input
                        id="patientId"
                        placeholder="123xyz123"
                        {...patientForm.register('patientId', { required: 'Patient ID is required' })}
                      />
                      {patientForm.formState.errors.patientId && (
                        <p className="text-sm text-destructive">{patientForm.formState.errors.patientId.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder="47"
                          {...patientForm.register('age', { 
                            required: 'Age is required',
                            valueAsNumber: true,
                            min: { value: 0, message: 'Age must be positive' }
                          })}
                        />
                        {patientForm.formState.errors.age && (
                          <p className="text-sm text-destructive">{patientForm.formState.errors.age.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          placeholder="78"
                          {...patientForm.register('weight', { 
                            required: 'Weight is required',
                            valueAsNumber: true,
                            min: { value: 0, message: 'Weight must be positive' }
                          })}
                        />
                        {patientForm.formState.errors.weight && (
                          <p className="text-sm text-destructive">{patientForm.formState.errors.weight.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm) - Optional</Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="175"
                        {...patientForm.register('height', { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bloodGroup">Blood Group - Optional</Label>
                      <Input
                        id="bloodGroup"
                        placeholder="A+"
                        {...patientForm.register('bloodGroup')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Emergency Contact - Optional</Label>
                      <Input
                        id="emergencyContact"
                        placeholder="+91 9876543210"
                        {...patientForm.register('emergencyContact')}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Update Patient
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Consultation Form */}
            {activeTab === 'consultation' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Add Consultation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={consultationForm.handleSubmit(handleAddConsultation)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientId">Patient ID</Label>
                      <Input
                        id="patientId"
                        placeholder="123xyz123"
                        {...consultationForm.register('patientId', { required: 'Patient ID is required' })}
                      />
                      {consultationForm.formState.errors.patientId && (
                        <p className="text-sm text-destructive">{consultationForm.formState.errors.patientId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doctorId">Doctor ID</Label>
                      <Input
                        id="doctorId"
                        placeholder="123docx123"
                        {...consultationForm.register('doctorId', { required: 'Doctor ID is required' })}
                      />
                      {consultationForm.formState.errors.doctorId && (
                        <p className="text-sm text-destructive">{consultationForm.formState.errors.doctorId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Date (optional)</Label>
                      <Input
                        id="date"
                        type="datetime-local"
                        {...consultationForm.register('date')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Consultation Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Patient complaints, examination findings, diagnosis, treatment plan..."
                        rows={6}
                        {...consultationForm.register('notes', { required: 'Notes are required' })}
                      />
                      {consultationForm.formState.errors.notes && (
                        <p className="text-sm text-destructive">{consultationForm.formState.errors.notes.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full">
                      Create Consultation
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Medical Records Display */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Existing Medical Records</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMedicalRecords}
                  className="w-fit"
                >
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No medical records found
                  </p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {records.map((record, index) => (
                      <div key={record.id || index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline">
                            {record.id ? `ID: ${record.id.slice(0, 8)}...` : `Record ${index + 1}`}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {record.timestamp?.toDate?.()?.toLocaleDateString() || 'No date'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><strong>Patient:</strong> {record.patientId}</p>
                          <p><strong>Doctor:</strong> {record.doctorId}</p>
                          {record.allergies && record.allergies.length > 0 && (
                            <p><strong>Allergies:</strong> {record.allergies.join(', ')}</p>
                          )}
                          {record.consultations && (
                            <p><strong>Consultation Ref:</strong> ✓</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}