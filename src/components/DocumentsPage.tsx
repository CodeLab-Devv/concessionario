import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from './ui/NotificationManager';
import { useRealtimeSubscription, type RealtimePayload } from '../hooks/useRealtimeSubscription';
import { getErrorMessage } from '../utils/errorHandling';

import { 
  Plus, 
  FileText, 
  User, 
  Car,
  Upload,
  Link,
  Eye,
  Edit,
  Trash2,
  X,
  ZoomIn,
  Search,
  Filter,
  Image as ImageIcon,
  CreditCard
} from 'lucide-react';

interface Document {
  id: string;
  customer_name: string;
  customer_surname: string;
  license_plate: string;
  vehicle_id?: number | null;
  license_image_url?: string;
  plate_image_url?: string;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  vehicle_name?: string | null;
  vehicle_type?: string | null;
}

// Custom Vehicle Search Component for Documents (no price, shows selection in input)
const VehicleSearchForDocuments: React.FC<{
  selectedVehicle: {id: number, name: string, type: string} | null;
  onVehicleSelect: (vehicle: {id: number, name: string, type: string, price: number}) => void;
  onClear: () => void;
  disabled?: boolean;
}> = ({ selectedVehicle, onVehicleSelect, onClear, disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicles, setVehicles] = useState<{id: number, name: string, type: string, price: number}[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Show selected vehicle in input or allow search
  const displayValue = selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.type})` : searchTerm;

  useEffect(() => {
    if (selectedVehicle || searchTerm.length < 2) {
      setVehicles([]);
      return;
    }

    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .limit(10);

        if (error) throw error;
        setVehicles(data || []);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchVehicles, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedVehicle]);

  const handleSelect = (vehicle: {id: number, name: string, type: string, price: number}) => {
    onVehicleSelect(vehicle);
    setSearchTerm('');
    setVehicles([]);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedVehicle) {
      // If there's a selected vehicle, clear it when user starts typing
      onClear();
    }
    setSearchTerm(e.target.value);
  };

  const handleClear = () => {
    onClear();
    setSearchTerm('');
    setVehicles([]);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => !selectedVehicle && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className={`block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          } ${selectedVehicle ? 'text-blue-800 bg-blue-50' : ''}`}
          placeholder="Cerca veicolo..."
          disabled={disabled}
        />
        {selectedVehicle && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && !selectedVehicle && (vehicles.length > 0 || loading) && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {loading ? (
            <div className="px-4 py-2 text-gray-500">Caricamento...</div>
          ) : (
            vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                onMouseDown={() => handleSelect(vehicle)}
              >
                <div className="flex items-center">
                  <Car className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="font-normal block truncate">
                    {vehicle.name}
                  </span>
                  <span className="ml-2 text-gray-500">
                    ({vehicle.type})
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [documents, setDocuments] = useState<Document[]>([]);
  const documentsCacheRef = useRef<Document[]>([]);
  const lastFetchTimeRef = useRef<number>(0);
  const initialLoadRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'with-images' | 'no-images'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerSurname: '',
    licensePlate: '',
    vehicleId: null as number | null,
    imageType: 'upload' as 'upload' | 'url',
    imageFile: null as File | null,
    imageUrl: ''
  });
  const [selectedVehicle, setSelectedVehicle] = useState<{id: number, name: string, type: string, price: number} | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{url: string, title: string} | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);

  // Check if user has access to documents - same logic as Sidebar
  const hasAccess = user?.isOnService && (
    ['vice_director', 'director', 'owner'].includes(user?.role || '') ||
    (['probation', 'employee'].includes(user?.role || '') && (!user?.employeeType || user?.employeeType === 'dealer'))
  );

  // Filter documents based on search and filter type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchTerm === '' || 
      doc.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.customer_surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.license_plate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' ||
      (filterType === 'with-images' && (doc.license_image_url || doc.plate_image_url)) ||
      (filterType === 'no-images' && !doc.license_image_url && !doc.plate_image_url);
    
    return matchesSearch && matchesFilter;
  });

  const fetchDocuments = useCallback(async (forceRefresh = false, isRealTimeUpdate = false) => {
    try {
      const now = Date.now();
      const cacheValidTime = 30000;
      
      if (!forceRefresh && !initialLoadRef.current && (now - lastFetchTimeRef.current) < cacheValidTime && documentsCacheRef.current.length > 0) {
        setDocuments(documentsCacheRef.current);
        return;
      }

      let loadingTimer: ReturnType<typeof setTimeout> | null = null;
      if (initialLoadRef.current) {
        setLoading(true);
        loadingTimer = setTimeout(() => {
          setLoading(false);
          console.warn('Documents fetch timed out after 20s');
        }, 20000);
      } else if (isRealTimeUpdate) {
        setRefreshing(true);
      }

      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          vehicles:vehicle_id (
            name,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (loadingTimer) clearTimeout(loadingTimer);

      if (error) throw error;

      const documentsWithVehicles = (data || []).map((doc) => ({
        ...doc,
        vehicle_name: doc.vehicles?.name || null,
        vehicle_type: doc.vehicles?.type || null,
        vehicles: undefined
      }));

      setDocuments(documentsWithVehicles);
      documentsCacheRef.current = documentsWithVehicles;
      lastFetchTimeRef.current = now;
      
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      showError('Errore', 'Impossibile caricare i documenti');
    } finally {
      if (initialLoadRef.current === false || documentsCacheRef.current.length > 0) {
        setLoading(false);
      }
      if (isRealTimeUpdate) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  }, [showError]);



  // Callback stabili per la sottoscrizione real-time
  const handleRealtimeInsert = useCallback((payload: RealtimePayload) => {
    console.log('Document inserted:', payload);
    fetchDocuments(true, true); // Forza refresh con indicatore real-time
  }, [fetchDocuments]);

  const handleRealtimeUpdate = useCallback((payload: RealtimePayload) => {
    console.log('Document updated:', payload);
    fetchDocuments(true, true); // Forza refresh con indicatore real-time
  }, [fetchDocuments]);

  const handleRealtimeDelete = useCallback((payload: RealtimePayload) => {
    console.log('Document deleted:', payload);
    fetchDocuments(true, true); // Forza refresh con indicatore real-time
  }, [fetchDocuments]);

  // Real-time subscription for documents
  useRealtimeSubscription({
    table: 'documents',
    enabled: hasAccess,
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete
  });

  useEffect(() => {
    if (hasAccess) {
      fetchDocuments();
    }
  }, [hasAccess, fetchDocuments]);

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!showCreateForm || formData.imageType !== 'upload') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            console.log('Pasted image file:', { name: file.name || 'pasted-image.png', size: file.size, type: file.type });
            
            // Create a proper file name for pasted images
            const timestamp = Date.now();
            const fileExt = file.type.split('/')[1] || 'png';
            const properFile = new File([file], `pasted-image-${timestamp}.${fileExt}`, {
              type: file.type,
              lastModified: timestamp
            });
            
            setFormData(prev => ({ ...prev, imageFile: properFile }));
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              setImagePreview(result);
              console.log('Image preview set for pasted image');
            };
            reader.onerror = (e) => {
              console.error('Error reading pasted image:', e);
              showError('Errore', 'Impossibile leggere l\'immagine incollata');
            };
            reader.readAsDataURL(properFile);
          }
          break;
        }
      }
    };

    if (showCreateForm) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [showCreateForm, formData.imageType, showError]);

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.error('File too large:', file.size);
        showError('Errore', 'Il file è troppo grande. Dimensione massima: 10MB');
        return null;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        showError('Errore', 'Formato file non supportato. Usa solo immagini.');
        return null;
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      console.log('Uploading file:', { fileName, filePath, fileSize: file.size, fileType: file.type });

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      console.log('Upload successful, public URL:', publicUrl);
      return publicUrl;
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      const errorMessage = getErrorMessage(error, '');
      
      // Provide more specific error messages
      if (errorMessage.includes('row-level security')) {
        showError('Errore', 'Permessi insufficienti per caricare l\'immagine.');
      } else if (errorMessage.includes('bucket')) {
        showError('Errore', 'Configurazione storage non valida.');
      } else {
        console.error('Upload error details:', error);
      }
      
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required fields
    if (!formData.vehicleId) {
      showError('Errore', 'Seleziona un veicolo');
      return;
    }

    if (!formData.imageFile && !formData.imageUrl) {
      showError('Errore', 'Carica un\'immagine o inserisci un link');
      return;
    }

    try {
      setLoading(true);

      let imageUrl = formData.imageUrl;

      // Upload file if selected
      if (formData.imageType === 'upload' && formData.imageFile) {
        console.log('Starting image upload for file:', formData.imageFile.name);
        const uploadedUrl = await uploadImage(formData.imageFile, 'documents');
        if (!uploadedUrl) {
          showError('Errore', 'Impossibile caricare l\'immagine. Verifica la connessione e riprova.');
          return;
        }
        imageUrl = uploadedUrl;
        console.log('Image upload completed, URL:', imageUrl);
      }

      // Final validation before saving
      if (formData.imageType === 'upload' && !imageUrl) {
        showError('Errore', 'Errore durante il caricamento dell\'immagine');
        return;
      }

      if (editingDocument) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update({
            customer_name: formData.customerName,
            customer_surname: formData.customerSurname,
            license_plate: formData.licensePlate.toUpperCase(),
            vehicle_id: formData.vehicleId,
            license_image_url: imageUrl || null
          })
          .eq('id', editingDocument.id);

        if (error) throw error;
        
        // Log the update activity
        await supabase.rpc('log_activity', {
          p_user_id: user.id,
          p_action: 'Modifica Documento',
          p_details: `${user.name} ha modificato il documento per ${formData.customerName} ${formData.customerSurname} - Targa: ${formData.licensePlate.toUpperCase()}`,
          p_target_user_id: null
        });
        
        showSuccess('Successo', 'Documento aggiornato con successo');
      } else {
        // Create new document
        const { error } = await supabase
          .from('documents')
          .insert({
            customer_name: formData.customerName,
            customer_surname: formData.customerSurname,
            license_plate: formData.licensePlate.toUpperCase(),
            vehicle_id: formData.vehicleId,
            license_image_url: imageUrl || null,
            created_by: user.id,
            created_by_name: user.name
          });

        if (error) throw error;
        
        // Log the creation activity
        await supabase.rpc('log_activity', {
          p_user_id: user.id,
          p_action: 'Creazione Documento',
          p_details: `${user.name} ha creato un nuovo documento per ${formData.customerName} ${formData.customerSurname} - Targa: ${formData.licensePlate.toUpperCase()}`,
          p_target_user_id: null
        });
        
        showSuccess('Successo', 'Documento creato con successo');
      }

      setShowCreateForm(false);
      setEditingDocument(null);
      setFormData({
        customerName: '',
        customerSurname: '',
        licensePlate: '',
        vehicleId: null,
        imageType: 'upload',
        imageFile: null,
        imageUrl: ''
      });
      setSelectedVehicle(null);
      setImagePreview(null);
      // Rimuovo fetchDocuments() manuale - la sottoscrizione real-time gestirà l'aggiornamento
    } catch (error) {
      console.error('Error saving document:', error);
      showError('Errore', 'Impossibile salvare il documento');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setFormData({
      customerName: document.customer_name,
      customerSurname: document.customer_surname,
      licensePlate: document.license_plate,
      vehicleId: document.vehicle_id || null,
      imageType: 'url' as 'upload' | 'url',
      imageFile: null,
      imageUrl: document.license_image_url || ''
    });
    
    // Set selected vehicle if document has vehicle info
    if (document.vehicle_name && document.vehicle_type && document.vehicle_id) {
      setSelectedVehicle({
        id: document.vehicle_id,
        name: document.vehicle_name,
        type: document.vehicle_type,
        price: 0 // Price not needed for display
      });
    } else {
      setSelectedVehicle(null);
    }
    
    setImagePreview(document.license_image_url || null);
    setShowCreateForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteDocumentId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteDocumentId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', deleteDocumentId);

      if (error) throw error;
      
      // Get document info for logging before deletion
      const documentToDelete = documents.find(doc => doc.id === deleteDocumentId);
      
      // Log the deletion activity
      if (user && documentToDelete) {
        await supabase.rpc('log_activity', {
          p_user_id: user.id,
          p_action: 'Eliminazione Documento',
          p_details: `${user.name} ha eliminato il documento per ${documentToDelete.customer_name} ${documentToDelete.customer_surname} - Targa: ${documentToDelete.license_plate}`,
          p_target_user_id: null
        });
      }
      
      showSuccess('Successo', 'Documento eliminato con successo');
      // Rimuovo fetchDocuments() manuale - la sottoscrizione real-time gestirà l'aggiornamento
      setDeleteDocumentId(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      showError('Errore', 'Impossibile eliminare il documento');
    } finally {
      setLoading(false);
      setDeleteDocumentId(null);
      setShowDeleteDialog(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteDocumentId(null);
  };

  const handleImagePreview = (url: string, title: string) => {
    setSelectedImage({ url, title });
    setShowImageModal(true);
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerSurname: '',
      licensePlate: '',
      vehicleId: null,
      imageType: 'upload',
      imageFile: null,
      imageUrl: ''
    });
    setSelectedVehicle(null);
    setImagePreview(null);
  };

  const handleVehicleSelect = (vehicle: {id: number, name: string, type: string, price: number}) => {
    setSelectedVehicle(vehicle);
    setFormData(prev => ({ ...prev, vehicleId: vehicle.id }));
  };

  if (!hasAccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600">Non hai i permessi per accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  if (loading && documents.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento documenti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-viewport bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Indicatore di caricamento sottile per aggiornamenti real-time */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse">
            <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent animate-[shimmer_1s_ease-in-out_infinite]" style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 1s ease-in-out infinite'
            }}></div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header with Gradient Background */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-600 rounded-2xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/30 to-yellow-400/30"></div>
          <div className="relative px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white">Immatricolazione</h1>
                    <p className="text-amber-100 mt-2 text-lg">Gestione dei documenti clienti</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-white/90">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">{filteredDocuments.length} documenti</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{user?.name}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="group bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 flex items-center space-x-3 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-lg">Immatricola</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca per nome, cognome o veicolo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'with-images' | 'no-images')}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">Tutti i documenti</option>
                  <option value="with-images">Con immagini</option>
                  <option value="no-images">Senza immagini</option>
                </select>
              </div>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                {filteredDocuments.length} risultati
              </div>
            </div>
          </div>
        </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="safe-area-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="modal-shell flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">
                      {editingDocument ? 'Modifica Documento' : 'Nuovo Documento'}
                    </h2>
                    <p className="text-amber-100 mt-1">Gestione documenti di immatricolazione</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingDocument(null);
                    resetForm();
                  }}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 group"
                >
                  <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>
            
            {/* Form Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Customer Info Section */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                      <User className="h-3 w-3 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800">Informazioni Cliente</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-1">
                        <span>Nome Cliente</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customerName}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white transition-all duration-200 hover:border-gray-300"
                        placeholder="Inserisci il nome"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-1">
                        <span>Cognome Cliente</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customerSurname}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerSurname: e.target.value }))}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white transition-all duration-200 hover:border-gray-300"
                        placeholder="Inserisci il cognome"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Info Section */}
                 <div className="bg-white rounded-lg p-3 border border-gray-200">
                   <div className="flex items-center space-x-2 mb-3">
                     <div className="w-6 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                       <Car className="h-3 w-3 text-white" />
                     </div>
                     <h3 className="text-base font-semibold text-gray-800">Informazioni Veicolo</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <div className="space-y-1">
                       <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-1">
                         <span>Targa Veicolo</span>
                         <span className="text-red-500">*</span>
                       </label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <CreditCard className="h-4 w-4 text-gray-400" />
                         </div>
                         <input
                           type="text"
                           required
                           value={formData.licensePlate}
                           onChange={(e) => setFormData(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                           className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white transition-all duration-200 hover:border-gray-300 font-mono tracking-wider"
                           placeholder="ABC123DE"
                         />
                       </div>
                     </div>
                     <div className="space-y-1">
                       <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-1">
                         <span>Modello Veicolo</span>
                         <span className="text-red-500">*</span>
                       </label>
                       <VehicleSearchForDocuments 
                         selectedVehicle={selectedVehicle}
                         onVehicleSelect={handleVehicleSelect}
                         onClear={() => {
                           setSelectedVehicle(null);
                           setFormData(prev => ({ ...prev, vehicleId: null }));
                         }}
                         disabled={loading}
                       />
                     </div>
                   </div>
                 </div>

                {/* Document Upload Section */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                      <FileText className="h-3 w-3 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800">Documento</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-6">
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="radio"
                            name="imageType"
                            value="upload"
                            checked={formData.imageType === 'upload'}
                            onChange={(e) => setFormData(prev => ({ ...prev, imageType: e.target.value as 'upload' | 'url' }))}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                            formData.imageType === 'upload' 
                              ? 'border-gray-500 bg-gray-500' 
                              : 'border-gray-300 group-hover:border-gray-400'
                          }`}>
                            {formData.imageType === 'upload' && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Upload className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Carica File</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="radio"
                            name="imageType"
                            value="url"
                            checked={formData.imageType === 'url'}
                            onChange={(e) => setFormData(prev => ({ ...prev, imageType: e.target.value as 'upload' | 'url' }))}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                            formData.imageType === 'url' 
                              ? 'border-gray-500 bg-gray-500' 
                              : 'border-gray-300 group-hover:border-gray-400'
                          }`}>
                            {formData.imageType === 'url' && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Link className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Link URL</span>
                        </div>
                      </label>
                    </div>

                    {formData.imageType === 'upload' ? (
                      <div className="space-y-2">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center bg-white hover:border-gray-400 transition-colors duration-200">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setFormData(prev => ({ ...prev, imageFile: file }));
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => setImagePreview(e.target?.result as string);
                                reader.readAsDataURL(file);
                              } else {
                                setImagePreview(null);
                              }
                            }}
                            className="hidden"
                            id="file-upload"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <div className="flex flex-col items-center space-y-1">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Upload className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Clicca per caricare un file</p>
                                <p className="text-xs text-gray-500">o trascina qui il documento</p>
                              </div>
                            </div>
                          </label>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <div className="flex items-start space-x-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                              <span className="text-white text-xs font-bold">💡</span>
                            </div>
                            <p className="text-xs text-blue-700">
                              <strong>Suggerimento:</strong> Puoi anche incollare un'immagine con <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Ctrl+V</kbd>
                            </p>
                          </div>
                        </div>
                        {formData.imageFile && formData.imageFile.name.includes('pasted-image') && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                            <p className="text-xs text-green-700 font-medium flex items-center space-x-1">
                              <span>✅</span>
                              <span>Immagine incollata correttamente!</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">URL del Documento</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Link className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="url"
                            value={formData.imageUrl}
                            onChange={(e) => {
                              const url = e.target.value;
                              setFormData(prev => ({ ...prev, imageUrl: url }));
                              setImagePreview(url || null);
                            }}
                            className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white transition-all duration-200 hover:border-gray-300"
                            placeholder="https://esempio.com/immagine-documento.jpg"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>Anteprima Documento</span>
                        </p>
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Anteprima documento"
                            className="max-w-full h-24 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setFormData(prev => ({ ...prev, imageFile: null, imageUrl: '' }));
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingDocument(null);
                      resetForm();
                    }}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 font-medium flex items-center justify-center space-x-1"
                  >
                    <X className="h-3 w-3" />
                    <span>Annulla</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-1"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>{editingDocument ? 'Aggiornamento...' : 'Creazione...'}</span>
                      </>
                    ) : (
                      <>
                        {editingDocument ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        <span>{editingDocument ? 'Aggiorna Documento' : 'Crea Documento'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' ? 'Nessun risultato' : 'Nessun documento'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType !== 'all' 
                ? 'Prova a modificare i criteri di ricerca o filtro' 
                : 'Inizia creando il primo documento cliente'}
            </p>
            {(!searchTerm && filterType === 'all') && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-6 py-3 rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 flex items-center space-x-2 mx-auto shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Crea il primo documento</span>
              </button>
            )}
          </div>
        ) : loading ? (
          // Skeleton loader per il caricamento iniziale
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
                {/* Skeleton Header */}
                <div className="bg-gray-100 p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-300 rounded-xl"></div>
                      <div>
                        <div className="h-5 bg-gray-300 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Skeleton Content */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
                      <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
                    </div>
                    <div className="h-32 bg-gray-200 rounded-lg"></div>
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="group bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl hover:border-amber-200 transition-all duration-300 overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                          {doc.customer_name} {doc.customer_surname}
                        </h3>
                        <p className="text-sm text-gray-600">Cliente</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEdit(doc)}
                        aria-label="Modifica documento"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-blue-600 hover:bg-blue-100 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Modifica documento"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        aria-label="Elimina documento"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-100 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Elimina documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {doc.vehicle_name ? (
                        <div className="min-w-0 flex max-w-full items-center space-x-2 rounded-lg bg-blue-50 px-3 py-2">
                          <Car className="h-4 w-4 text-blue-600" />
                          <div className="min-w-0 text-sm">
                            <div className="truncate font-medium text-blue-800">{doc.vehicle_name}</div>
                            <div className="text-xs text-blue-600">{doc.vehicle_type}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex max-w-full items-center space-x-2 rounded-lg bg-gray-50 px-3 py-2">
                          <Car className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Veicolo non specificato</span>
                        </div>
                      )}
                      <div className="flex shrink-0 items-center space-x-2 rounded-lg bg-green-50 px-3 py-2">
                        <span className="text-xs text-green-600 font-medium">TARGA</span>
                        <span className="text-sm font-bold text-green-800">
                          {doc.license_plate}
                        </span>
                      </div>
                    </div>

                    {/* Images Section */}
                    {doc.license_image_url ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <ImageIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Documento allegato</span>
                        </div>
                        <div className="relative group/img">
                          <button
                            onClick={() => handleImagePreview(doc.license_image_url!, 'Documento di ' + doc.customer_name + ' ' + doc.customer_surname)}
                            className="relative w-full h-32 overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 group-hover/img:scale-105"
                          >
                            <img
                              src={doc.license_image_url}
                              alt="Documento"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/img:bg-opacity-30 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                            </div>
                          </button>
                          <div className="flex items-center justify-center space-x-1 mt-2">
                            <CreditCard className="h-4 w-4 text-blue-500" />
                            <p className="text-sm text-gray-600 font-medium">Documento</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Nessun documento allegato</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Creato da {doc.created_by_name}</span>
                        </div>
                        <div className="text-right">
                          <div>{new Date(doc.created_at).toLocaleDateString('it-IT')}</div>
                          <div className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="safe-area-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="modal-shell w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Conferma Eliminazione</h3>
                    <p className="text-sm text-gray-600">Questa azione non può essere annullata</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-6">
                  Sei sicuro di voler eliminare questo documento? Tutti i dati associati verranno rimossi definitivamente.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={cancelDelete}
                    className="min-h-11 flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={loading}
                    className="min-h-11 flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? 'Eliminazione...' : 'Elimina'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {showImageModal && selectedImage && (
          <div className="safe-area-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="modal-shell relative flex w-full max-w-4xl items-center justify-center overflow-y-auto">
              <button
                onClick={() => setShowImageModal(false)}
                aria-label="Chiudi anteprima"
                className="absolute right-2 top-2 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-black/40 text-white hover:text-gray-300 sm:right-4 sm:top-4"
              >
                <X className="h-8 w-8" />
              </button>
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-blue-600" />
                    {selectedImage.title}
                  </h3>
                </div>
                <div className="p-6">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.title}
                    className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
