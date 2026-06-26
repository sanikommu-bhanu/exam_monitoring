'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, User, Book, GraduationCap, Calendar, Hash, Phone, ArrowRight } from 'lucide-react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfileCompletionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    register_number: '',
    department: '',
    year: 1,
    section: '',
    mobile_number: '',
    profile_photo_base64: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        setFormData({ ...formData, profile_photo_base64: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.profile_photo_base64) {
      toast.error('Please upload a passport-size photo');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.updateProfile({
        ...formData,
        year: Number(formData.year)
      });
      toast.success('Profile updated successfully!');
      router.push('/student/register-face');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl glass-card p-8"
      >
        <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
        <p className="text-foreground-muted mb-8">Please provide your details to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center space-y-4">
              <div 
                className="w-40 h-48 rounded-xl border-2 border-dashed border-border bg-background/50 flex flex-col items-center justify-center overflow-hidden cursor-pointer relative group"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-foreground-muted mb-2 group-hover:text-primary transition-colors" />
                    <span className="text-sm text-foreground-muted group-hover:text-primary transition-colors">Upload Photo</span>
                  </>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Change Photo</span>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange}
              />
              <p className="text-xs text-foreground-muted text-center max-w-[160px]">
                Passport size photo<br/>Max 2MB (JPG/PNG)
              </p>
            </div>

            {/* Form Fields Section */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground-muted block mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="ai-input pl-10" required placeholder="John Doe" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground-muted block mb-1.5">Register Number</label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <input type="text" name="register_number" value={formData.register_number} onChange={handleChange} className="ai-input pl-10" required placeholder="STU12345" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground-muted block mb-1.5">Department</label>
                <div className="relative">
                  <Book className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <input type="text" name="department" value={formData.department} onChange={handleChange} className="ai-input pl-10" required placeholder="Computer Science" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground-muted block mb-1.5">Year</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <select name="year" value={formData.year} onChange={handleChange} className="ai-input pl-10 appearance-none bg-transparent" required>
                    <option value="1" className="bg-background">1st Year</option>
                    <option value="2" className="bg-background">2nd Year</option>
                    <option value="3" className="bg-background">3rd Year</option>
                    <option value="4" className="bg-background">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground-muted block mb-1.5">Section</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <input type="text" name="section" value={formData.section} onChange={handleChange} className="ai-input pl-10" required placeholder="A" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground-muted block mb-1.5">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} className="ai-input pl-10" required placeholder="+91 9876543210" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save & Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
