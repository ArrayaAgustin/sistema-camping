import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services';
import { campingsService, type CampingData, type CampingInput } from '../../services/campings.service';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default icon (evita íconos rotos con Vite)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Componente helper: captura clicks en el mapa para seleccionar coordenadas
const MapClickHandler: React.FC<{ onSelect: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
};

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface PersonaBasic {
  id: number;
  dni: string;
  apellido?: string | null;
  nombres?: string | null;
  nombre_completo?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  email?: string | null;
  telefono?: string | null;
  qr_code: string;
}

interface PersonaDetail {
  persona: PersonaBasic;
  tipos: string[];
  afiliado?: {
    id: number;
    cuil: string;
    sexo?: string | null;
    tipo_afiliado?: string | null;
    fecha_nacimiento?: string | null;
    categoria?: string | null;
    situacion_sindicato?: string | null;
    situacion_obra_social?: string | null;
    domicilio?: string | null;
    provincia?: string | null;
    localidad?: string | null;
    empresa_cuit?: string | null;
    empresa_nombre?: string | null;
    codigo_postal?: string | null;
    grupo_sanguineo?: string | null;
    foto_url?: string | null;
    activo?: boolean | null;
  } | null;
  familiares?: Array<{
    id: number;
    afiliado_id: number;
    persona_id?: number | null;
    estudia?: boolean | null;
    discapacitado?: boolean | null;
    baja?: boolean | null;
    activo?: boolean | null;
    persona?: PersonaBasic | null;
    afiliado_titular?: { id: number; cuil: string; persona?: PersonaBasic | null };
  }>;
  invitado?: {
    id: number;
    vigente_desde?: string | null;
    vigente_hasta?: string | null;
    aplica_a_familia?: boolean | null;
    activo?: boolean | null;
    vigente?: boolean | null;
  } | null;
  es_familiar_de?: Array<{
    id: number;
    afiliado_id: number;
    estudia?: boolean | null;
    discapacitado?: boolean | null;
    baja?: boolean | null;
    activo?: boolean | null;
    afiliado_titular?: { id: number; cuil: string; persona?: PersonaBasic | null };
  }>;
  usuario?: {
    id: number;
    username: string;
    activo?: boolean | null;
    must_change_password?: boolean | null;
    ultimo_acceso?: string | null;
  } | null;
  roles?: Array<{
    id: number;
    nombre?: string;
    activo: boolean;
    camping_id?: number | null;
    camping?: { id: number; nombre: string } | null;
  }>;
}

interface SearchItem {
  persona: PersonaBasic;
  tipos: string[];
}

// ─── Valores iniciales del formulario ─────────────────────────────────────────

const emptyPersona = {
  dni: '', apellido: '', nombres: '', sexo: '', fecha_nacimiento: '', email: '', telefono: ''
};
const emptyAfiliado = {
  cuil: '', sexo: '', tipo_afiliado: '', fecha_nacimiento: '', categoria: '',
  situacion_sindicato: 'ACTIVO', situacion_obra_social: 'ACTIVO',
  domicilio: '', provincia: '', localidad: '', codigo_postal: '',
  empresa_cuit: '', empresa_nombre: '', grupo_sanguineo: '', foto_url: '',
  activo: true
};
const emptyFamiliar = {
  titular_dni: '', afiliado_id: '', estudia: false, discapacitado: false, baja: false, activo: true
};
const emptyInvitado = {
  vigente_desde: '', vigente_hasta: '', aplica_a_familia: true, activo: true
};

// ─── Componente principal ─────────────────────────────────────────────────────

const AdminPanel: React.FC = () => {
  const { logout } = useAuth();

  // Búsqueda general
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Persona actual en el formulario
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [personaDetail, setPersonaDetail] = useState<PersonaDetail | null>(null);
  const [isLoadingPersona, setIsLoadingPersona] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Secciones collapsibles
  const [openSections, setOpenSections] = useState({ afiliado: false, familiar: false, invitado: false });

  // Form data
  const [formData, setFormData] = useState({
    persona: { ...emptyPersona },
    afiliado: { ...emptyAfiliado },
    familiar: { ...emptyFamiliar },
    invitado: { ...emptyInvitado }
  });

  // Búsqueda de titular para familiar
  const [titularInfo, setTitularInfo] = useState<{ nombre: string; dni: string; afiliado_id: number } | null>(null);
  const [isBuscandoTitular, setIsBuscandoTitular] = useState(false);

  // Catálogo (roles y campings)
  const [catalogo, setCatalogo] = useState<{ roles: { id: number; nombre: string; descripcion?: string }[]; campings: { id: number; nombre: string }[] }>({ roles: [], campings: [] });
  const [rolParaAsignar, setRolParaAsignar] = useState({ rolId: '', campingId: '' });
  const [isAsignandoRol, setIsAsignandoRol] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Validación de campos
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Tab activa del panel admin
  const [activeTab, setActiveTab] = useState<'personas' | 'campings'>('personas');

  // Estado del tab Campings
  const [campingsList, setCampingsList] = useState<CampingData[]>([]);
  const [isLoadingCampings, setIsLoadingCampings] = useState(false);
  const [activeCampingId, setActiveCampingId] = useState<number | null>(null);
  const [campingForm, setCampingForm] = useState<CampingInput & { id?: number }>({
    nombre: '', descripcion: '', ubicacion: '', provincia: '', localidad: '',
    telefono: '', email: '', latitud: null, longitud: null, foto_url: null, activo: true
  });
  const [isSavingCamping, setIsSavingCamping] = useState(false);
  const [campingMessage, setCampingMessage] = useState<{ text: string; type: 'ok' | 'error' } | null>(null);

  // Agregar familiar al grupo familiar del afiliado (panel derecho)
  const [familiarToAdd, setFamiliarToAdd] = useState<{
    dni: string;
    personaFound: PersonaBasic | null;
    needsCreation: boolean;
    apellido: string;
    nombres: string;
    isBuscando: boolean;
    isAdding: boolean;
    message: string | null;
  } | null>(null);

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    adminService.getCatalogo()
      .then((res: any) => {
        const data = res?.data ?? res;
        if (data?.roles) setCatalogo(data);
      })
      .catch(() => {/* catálogo no crítico */});
  }, []);

  // ─── Búsqueda con debounce ──────────────────────────────────────────────────

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await adminService.searchPersonas(searchQuery) as any;
        setSearchResults(res?.data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Helpers de campo ───────────────────────────────────────────────────────

  const setPersonaField = (field: string, value: string) =>
    setFormData(p => ({ ...p, persona: { ...p.persona, [field]: value } }));

  const setAfiliadoField = (field: string, value: string | boolean) =>
    setFormData(p => ({ ...p, afiliado: { ...p.afiliado, [field]: value } }));

  const setFamiliarField = (field: string, value: string | boolean) =>
    setFormData(p => ({ ...p, familiar: { ...p.familiar, [field]: value } }));

  const setInvitadoField = (field: string, value: string | boolean) =>
    setFormData(p => ({ ...p, invitado: { ...p.invitado, [field]: value } }));

  const toggleSection = (s: 'afiliado' | 'familiar' | 'invitado') =>
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

  // ─── Mapear detalle al formulario ───────────────────────────────────────────

  const mapDetailToForm = useCallback((detail: PersonaDetail) => {
    setPersonaId(detail.persona.id);
    setPersonaDetail(detail);

    const p = detail.persona;
    setFormData({
      persona: {
        dni: p.dni ?? '',
        apellido: p.apellido ?? '',
        nombres: p.nombres ?? '',
        sexo: p.sexo ?? '',
        fecha_nacimiento: p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : '',
        email: p.email ?? '',
        telefono: p.telefono ?? ''
      },
      afiliado: detail.afiliado ? {
        cuil: detail.afiliado.cuil ?? '',
        sexo: detail.afiliado.sexo ?? '',
        tipo_afiliado: detail.afiliado.tipo_afiliado ?? '',
        fecha_nacimiento: detail.afiliado.fecha_nacimiento ? String(detail.afiliado.fecha_nacimiento).slice(0, 10) : '',
        categoria: detail.afiliado.categoria ?? '',
        situacion_sindicato: detail.afiliado.situacion_sindicato ?? 'ACTIVO',
        situacion_obra_social: detail.afiliado.situacion_obra_social ?? 'ACTIVO',
        domicilio: detail.afiliado.domicilio ?? '',
        provincia: detail.afiliado.provincia ?? '',
        localidad: detail.afiliado.localidad ?? '',
        codigo_postal: detail.afiliado.codigo_postal ?? '',
        empresa_cuit: detail.afiliado.empresa_cuit ?? '',
        empresa_nombre: detail.afiliado.empresa_nombre ?? '',
        grupo_sanguineo: detail.afiliado.grupo_sanguineo ?? '',
        foto_url: detail.afiliado.foto_url ?? '',
        activo: detail.afiliado.activo ?? true
      } : { ...emptyAfiliado },
      familiar: (() => {
        const fam = detail.es_familiar_de?.[0];
        if (fam) {
          const tit = fam.afiliado_titular;
          const titNombre = tit?.persona
            ? (tit.persona.nombre_completo || `${tit.persona.apellido ?? ''} ${tit.persona.nombres ?? ''}`.trim())
            : '';
          if (tit) {
            setTitularInfo({ nombre: titNombre, dni: tit.persona?.dni ?? '', afiliado_id: fam.afiliado_id });
          }
          return {
            titular_dni: tit?.persona?.dni ?? '',
            afiliado_id: String(fam.afiliado_id),
            estudia: fam.estudia ?? false,
            discapacitado: fam.discapacitado ?? false,
            baja: fam.baja ?? false,
            activo: fam.activo ?? true
          };
        }
        return { ...emptyFamiliar };
      })(),
      invitado: detail.invitado ? {
        vigente_desde: detail.invitado.vigente_desde ? String(detail.invitado.vigente_desde).slice(0, 10) : '',
        vigente_hasta: detail.invitado.vigente_hasta ? String(detail.invitado.vigente_hasta).slice(0, 10) : '',
        aplica_a_familia: detail.invitado.aplica_a_familia ?? true,
        activo: detail.invitado.activo ?? true
      } : { ...emptyInvitado }
    });

    setOpenSections({
      afiliado: !!detail.afiliado,
      familiar: (detail.es_familiar_de?.length ?? 0) > 0,
      invitado: !!detail.invitado
    });
  }, []);

  // ─── Cargar persona por DNI (usado desde botones externos como familiares) ────

  const handleCargarPersonaPorDni = async (dni: string) => {
    if (!dni) return;
    setIsLoadingPersona(true);
    setTitularInfo(null);
    // Actualizar el campo DNI del formulario para que el usuario vea qué está buscando
    setFormData(prev => ({ ...prev, persona: { ...prev.persona, dni } }));
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await adminService.getPersonaByDni(dni) as any;
      const detail: PersonaDetail = res?.data ?? res;
      if (detail?.persona?.id) {
        mapDetailToForm(detail);
        toast.success('Familiar cargado para edición.');
      } else {
        throw new Error('Sin datos');
      }
    } catch (err: any) {
      setPersonaId(null);
      setPersonaDetail(null);
      setOpenSections({ afiliado: false, familiar: false, invitado: false });
      toast.error(err?.message || 'Error cargando el familiar.');
    } finally {
      setIsLoadingPersona(false);
    }
  };

  // ─── Buscar persona por DNI ─────────────────────────────────────────────────

  const handleBuscarPorDni = async () => {
    const dni = formData.persona.dni.trim();
    if (!dni) return;
    setIsLoadingPersona(true);
    setTitularInfo(null);
    try {
      const res = await adminService.getPersonaByDni(dni) as any;
      const detail: PersonaDetail = res?.data ?? res;
      if (detail?.persona?.id) {
        mapDetailToForm(detail);
        toast.success('Persona encontrada.');
      } else {
        throw new Error('Sin datos');
      }
    } catch (err: any) {
      setPersonaId(null);
      setPersonaDetail(null);
      setOpenSections({ afiliado: false, familiar: false, invitado: false });
      setFormData(prev => ({
        ...prev,
        persona: { ...emptyPersona, dni: formData.persona.dni },
        afiliado: { ...emptyAfiliado },
        familiar: { ...emptyFamiliar },
        invitado: { ...emptyInvitado }
      }));
      if (err?.status === 404 || err?.message?.includes('Sin datos')) {
        toast.info('Persona no encontrada. Completá los datos para crearla.');
      } else {
        toast.error(err?.message || 'Error buscando persona.');
      }
    } finally {
      setIsLoadingPersona(false);
    }
  };

  // ─── Buscar titular para familiar ───────────────────────────────────────────

  const handleBuscarTitular = async () => {
    const dni = formData.familiar.titular_dni.trim();
    if (!dni) return;
    setIsBuscandoTitular(true);
    try {
      const res = await adminService.findTitularByDni(dni) as any;
      const data = res?.data ?? res;
      if (!data?.afiliado_id) {
        toast.error('El DNI ingresado no corresponde a un afiliado titular.');
        return;
      }
      const nombre = data.nombre_completo || `${data.apellido ?? ''} ${data.nombres ?? ''}`.trim();
      setTitularInfo({ nombre, dni: data.dni, afiliado_id: data.afiliado_id });
      setFamiliarField('afiliado_id', String(data.afiliado_id));
      toast.success(`Titular encontrado: ${nombre}`);
    } catch {
      setTitularInfo(null);
      toast.error('Titular no encontrado. Verificá que el DNI corresponda a un afiliado activo.');
    } finally {
      setIsBuscandoTitular(false);
    }
  };

  // ─── Guardar persona ────────────────────────────────────────────────────────

  const handleGuardarPersona = async () => {
    if (!validateForm()) {
      toast.error('Corregí los errores marcados antes de guardar.');
      return;
    }
    const dni = formData.persona.dni.trim();
    setFormErrors({});
    setIsSaving(true);

    const payload: any = {
      dni,
      apellido: formData.persona.apellido.trim() || null,
      nombres: formData.persona.nombres.trim() || null,
      sexo: formData.persona.sexo || null,
      fecha_nacimiento: formData.persona.fecha_nacimiento || null,
      email: formData.persona.email.trim() || null,
      telefono: formData.persona.telefono.trim() || null
    };

    if (openSections.afiliado) {
      payload.afiliado = {
        cuil: formData.afiliado.cuil.trim(),
        sexo: (formData.afiliado.sexo || formData.persona.sexo || null),
        tipo_afiliado: formData.afiliado.tipo_afiliado.trim() || null,
        fecha_nacimiento: formData.afiliado.fecha_nacimiento || null,
        categoria: formData.afiliado.categoria.trim() || null,
        situacion_sindicato: formData.afiliado.situacion_sindicato || null,
        situacion_obra_social: formData.afiliado.situacion_obra_social || null,
        domicilio: formData.afiliado.domicilio.trim() || null,
        provincia: formData.afiliado.provincia.trim() || null,
        localidad: formData.afiliado.localidad.trim() || null,
        codigo_postal: formData.afiliado.codigo_postal.trim() || null,
        empresa_cuit: formData.afiliado.empresa_cuit.trim() || null,
        empresa_nombre: formData.afiliado.empresa_nombre.trim() || null,
        grupo_sanguineo: formData.afiliado.grupo_sanguineo.trim() || null,
        foto_url: formData.afiliado.foto_url.trim() || null,
        activo: formData.afiliado.activo
      };
    }

    if (openSections.familiar && formData.familiar.afiliado_id) {
      payload.familiar = {
        afiliado_id: Number(formData.familiar.afiliado_id),
        estudia: formData.familiar.estudia,
        discapacitado: formData.familiar.discapacitado,
        baja: formData.familiar.baja,
        activo: formData.familiar.activo
      };
    }

    if (openSections.invitado) {
      payload.invitado = {
        vigente_desde: formData.invitado.vigente_desde || null,
        vigente_hasta: formData.invitado.vigente_hasta || null,
        aplica_a_familia: formData.invitado.aplica_a_familia,
        activo: formData.invitado.activo
      };
    }

    try {
      const res = personaId
        ? await adminService.updatePersona(personaId, payload) as any
        : await adminService.createPersona(payload) as any;

      const detail: PersonaDetail = res?.data ?? res;
      mapDetailToForm(detail);

      // Si es persona nueva y no tiene usuario, crear automáticamente
      if (!personaId && detail?.persona?.id && !detail.usuario) {
        try {
          await adminService.createUsuarioFromPersona(detail.persona.id, dni);
          // Recargar para ver el usuario creado
          const refreshed = await adminService.getPersonaByDni(dni) as any;
          const detailRefreshed: PersonaDetail = refreshed?.data ?? refreshed;
          if (detailRefreshed?.persona?.id) mapDetailToForm(detailRefreshed);
          toast.success('Persona y usuario creados correctamente. Contraseña inicial: DNI.');
        } catch {
          toast.info('Persona guardada. No se pudo crear el usuario automáticamente.');
        }
      } else {
        toast.success('Datos guardados correctamente.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error guardando los datos.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Crear usuario manualmente ──────────────────────────────────────────────

  const handleCrearUsuario = async () => {
    if (!personaId || !formData.persona.dni) return;
    setIsCreatingUser(true);
    try {
      await adminService.createUsuarioFromPersona(personaId, formData.persona.dni);
      const res = await adminService.getPersonaByDni(formData.persona.dni) as any;
      const detail: PersonaDetail = res?.data ?? res;
      if (detail?.persona?.id) mapDetailToForm(detail);
      toast.success('Usuario creado. Contraseña inicial: DNI.');
    } catch (err: any) {
      toast.error(err?.message || 'Error creando el usuario.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // ─── Resetear contraseña ────────────────────────────────────────────────────

  const handleResetPassword = async () => {
    if (!personaDetail?.usuario?.id) return;
    setIsResettingPassword(true);
    try {
      await adminService.resetPassword(personaDetail.usuario.id);
      toast.success(`Contraseña reseteada al DNI (${formData.persona.dni}). El usuario deberá cambiarla al ingresar.`);
    } catch (err: any) {
      toast.error(err?.message || 'Error reseteando la contraseña.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // ─── Asignar rol ────────────────────────────────────────────────────────────

  const handleAsignarRol = async () => {
    if (!personaDetail?.usuario?.id || !rolParaAsignar.rolId) return;
    setIsAsignandoRol(true);
    try {
      const campingId = rolParaAsignar.campingId ? Number(rolParaAsignar.campingId) : null;
      await adminService.asignarRol(personaDetail.usuario.id, Number(rolParaAsignar.rolId), campingId);
      // Recargar
      const res = await adminService.getPersonaByDni(formData.persona.dni) as any;
      const detail: PersonaDetail = res?.data ?? res;
      if (detail?.persona?.id) mapDetailToForm(detail);
      setRolParaAsignar({ rolId: '', campingId: '' });
      toast.success('Rol asignado correctamente.');
    } catch (err: any) {
      toast.error(err?.message || 'Error asignando el rol.');
    } finally {
      setIsAsignandoRol(false);
    }
  };

  // ─── Validación ─────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const dni = formData.persona.dni.trim();
    if (!dni) {
      errors.dni = 'El DNI es obligatorio.';
    } else if (!/^[0-9]{7,8}$/.test(dni)) {
      errors.dni = 'El DNI debe tener 7 u 8 dígitos numéricos.';
    }
    if (openSections.afiliado) {
      const cuil = formData.afiliado.cuil.trim();
      if (!cuil) {
        errors.cuil = 'El CUIL es obligatorio para afiliado sindical.';
      } else if (!/^[0-9]{11}$/.test(cuil)) {
        errors.cuil = 'El CUIL debe tener exactamente 11 dígitos numéricos.';
      }
      const ecuit = formData.afiliado.empresa_cuit.trim();
      if (ecuit && !/^[0-9]{11}$/.test(ecuit)) {
        errors.empresa_cuit = 'El CUIT de empresa debe tener 11 dígitos.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Agregar familiar al grupo (desde panel derecho) ─────────────────────────

  const handleVerificarFamiliarDni = async () => {
    if (!familiarToAdd) return;
    const dni = familiarToAdd.dni.trim();
    if (!/^[0-9]{7,8}$/.test(dni)) {
      setFamiliarToAdd(prev => prev && { ...prev, message: 'DNI inválido. Debe tener 7 u 8 dígitos numéricos.', personaFound: null, needsCreation: false });
      return;
    }
    setFamiliarToAdd(prev => prev && { ...prev, isBuscando: true, message: null, personaFound: null, needsCreation: false });
    try {
      const res = await adminService.getPersonaByDni(dni) as any;
      const detail = res?.data ?? res;
      if (detail?.persona?.id) {
        const p: PersonaBasic = detail.persona;
        const nombre = p.nombre_completo || `${p.apellido ?? ''} ${p.nombres ?? ''}`.trim() || p.dni;
        setFamiliarToAdd(prev => prev && { ...prev, isBuscando: false, personaFound: p, needsCreation: false, message: `✓ Persona encontrada: ${nombre}` });
      } else {
        setFamiliarToAdd(prev => prev && { ...prev, isBuscando: false, needsCreation: true, message: 'Persona no encontrada. Completá los datos para crearla.' });
      }
    } catch {
      setFamiliarToAdd(prev => prev && { ...prev, isBuscando: false, needsCreation: true, message: 'Persona no encontrada. Completá los datos para crearla.' });
    }
  };

  const handleAgregarFamiliarAlGrupo = async () => {
    if (!familiarToAdd || !personaDetail?.afiliado) return;
    const afiliadoId = personaDetail.afiliado.id;
    const dni = familiarToAdd.dni.trim();
    if (!familiarToAdd.personaFound && familiarToAdd.needsCreation && !familiarToAdd.apellido.trim()) {
      setFamiliarToAdd(prev => prev && { ...prev, message: 'El apellido es obligatorio para crear la persona.' });
      return;
    }
    setFamiliarToAdd(prev => prev && { ...prev, isAdding: true, message: null });
    try {
      const payload: any = {
        dni,
        familiar: { afiliado_id: afiliadoId, estudia: false, discapacitado: false, baja: false, activo: true }
      };
      if (familiarToAdd.needsCreation && !familiarToAdd.personaFound) {
        payload.apellido = familiarToAdd.apellido.trim() || null;
        payload.nombres = familiarToAdd.nombres.trim() || null;
      }
      await adminService.createPersona(payload);
      // Recargar la persona actual para reflejar el nuevo familiar en su grupo
      const res = await adminService.getPersonaByDni(formData.persona.dni) as any;
      const detail: PersonaDetail = res?.data ?? res;
      if (detail?.persona?.id) mapDetailToForm(detail);
      setFamiliarToAdd(null);
      toast.success('Familiar agregado al grupo correctamente.');
    } catch (err: any) {
      setFamiliarToAdd(prev => prev && { ...prev, isAdding: false, message: err?.message || 'Error agregando el familiar.' });
    }
  };

  // ─── Cargar persona desde resultado de búsqueda ─────────────────────────────

  const handleSelectResult = async (item: SearchItem) => {
    setFormData(p => ({ ...p, persona: { ...p.persona, dni: item.persona.dni } }));
    setIsLoadingPersona(true);
    setTitularInfo(null);
    try {
      const res = await adminService.getPersonaById(item.persona.id) as any;
      const detail: PersonaDetail = res?.data ?? res;
      if (detail?.persona?.id) {
        mapDetailToForm(detail);
        toast.success('Persona cargada.');
      }
    } catch {
      toast.error('Error cargando la persona.');
    } finally {
      setIsLoadingPersona(false);
    }
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const rolSeleccionado = catalogo.roles.find(r => String(r.id) === rolParaAsignar.rolId);
  const esOperador = rolSeleccionado?.nombre?.toLowerCase() === 'operador';

  const SectionHeader = ({ label, section, badge }: { label: string; section: 'afiliado' | 'familiar' | 'invitado'; badge?: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
    >
      <span className="flex items-center gap-2">
        {label}
        {badge && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">{badge}</span>}
      </span>
      <span className="text-slate-400">{openSections[section] ? '▲' : '▼'}</span>
    </button>
  );

  // ─── Campings handlers ──────────────────────────────────────────────────────

  const loadCampings = useCallback(async () => {
    setIsLoadingCampings(true);
    try {
      const res: any = await campingsService.getAllAdmin();
      const data = res?.data ?? res ?? [];
      setCampingsList(Array.isArray(data) ? data : []);
    } catch { /* silencioso */ } finally {
      setIsLoadingCampings(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'campings') loadCampings();
  }, [activeTab, loadCampings]);

  const resetCampingForm = () => {
    setActiveCampingId(null);
    setCampingForm({ nombre: '', descripcion: '', ubicacion: '', provincia: '', localidad: '', telefono: '', email: '', latitud: null, longitud: null, foto_url: null, activo: true });
    setCampingMessage(null);
  };

  const loadCampingToForm = (c: CampingData) => {
    setActiveCampingId(c.id);
    setCampingForm({ nombre: c.nombre, descripcion: c.descripcion ?? '', ubicacion: c.ubicacion ?? '', provincia: c.provincia ?? '', localidad: c.localidad ?? '', telefono: c.telefono ?? '', email: c.email ?? '', latitud: c.latitud ?? null, longitud: c.longitud ?? null, foto_url: c.foto_url ?? null, activo: c.activo ?? true });
    setCampingMessage(null);
  };

  const handleSaveCamping = async () => {
    if (!campingForm.nombre?.trim()) { setCampingMessage({ text: 'El nombre es requerido', type: 'error' }); return; }
    setIsSavingCamping(true);
    setCampingMessage(null);
    try {
      const payload: CampingInput = { ...campingForm, nombre: campingForm.nombre.trim() };
      if (activeCampingId) {
        await campingsService.update(activeCampingId, payload);
        setCampingMessage({ text: 'Camping actualizado correctamente', type: 'ok' });
      } else {
        await campingsService.create(payload);
        setCampingMessage({ text: 'Camping creado correctamente', type: 'ok' });
        resetCampingForm();
      }
      await loadCampings();
    } catch {
      setCampingMessage({ text: 'Error al guardar el camping', type: 'error' });
    } finally {
      setIsSavingCamping(false);
    }
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCampingForm(prev => ({ ...prev, foto_url: ev.target?.result as string ?? null }));
    reader.readAsDataURL(file);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Botón Salir — fijo arriba a la derecha, siempre visible */}
      <button
        type="button"
        onClick={logout}
        title="Cerrar sesión"
        className="fixed top-3 right-3 z-50 flex items-center gap-1 rounded-full border border-rose-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-400 shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors"
      >
        <span>⬡</span> Salir
      </button>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center justify-between gap-2 pr-20">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-primary-500 hidden sm:block">Admin</p>
              <h1 className="text-base font-bold leading-tight sm:text-lg truncate">Panel de administración</h1>
            </div>
            <Link
              to="/"
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              ← Inicio
            </Link>
          </div>
          {/* Tabs */}
          <div className="mt-2 flex rounded-xl border border-slate-200 bg-slate-100 p-1 gap-1 w-fit">
            {(['personas', 'campings'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab === 'personas' ? 'Personas' : 'Campings'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6">

        {/* ══════════════ TAB CAMPINGS ══════════════ */}
        {activeTab === 'campings' && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

            {/* Columna izquierda: Formulario camping */}
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{activeCampingId ? 'Editar camping' : 'Nuevo camping'}</h2>
                  {activeCampingId && (
                    <button type="button" onClick={resetCampingForm} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                      + Nuevo
                    </button>
                  )}
                </div>

                {campingMessage && (
                  <div className={`mb-4 rounded-xl px-4 py-2 text-sm font-medium ${campingMessage.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {campingMessage.text}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre *</label>
                    <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-400" value={campingForm.nombre} onChange={e => setCampingForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Camping Valle Hermoso" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</label>
                    <textarea className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-400 resize-none" rows={2} value={campingForm.descripcion ?? ''} onChange={e => setCampingForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del camping..." />
                  </div>
                  {[
                    { label: 'Ubicación / Dirección', field: 'ubicacion', placeholder: 'Av. Costanera 1200' },
                    { label: 'Provincia', field: 'provincia', placeholder: 'Córdoba' },
                    { label: 'Localidad', field: 'localidad', placeholder: 'Córdoba Capital' },
                    { label: 'Teléfono', field: 'telefono', placeholder: '(351) 555-1234' },
                    { label: 'Email', field: 'email', placeholder: 'camping@ejemplo.com' },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
                      <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-400" value={(campingForm as any)[field] ?? ''} onChange={e => setCampingForm(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder} />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="camping-activo" checked={campingForm.activo ?? true} onChange={e => setCampingForm(p => ({ ...p, activo: e.target.checked }))} className="h-4 w-4 rounded" />
                    <label htmlFor="camping-activo" className="text-sm font-medium text-slate-700">Activo (visible en el Home)</label>
                  </div>
                </div>

                {/* Foto */}
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Foto del camping</label>
                  <div className="mt-2 flex items-center gap-3">
                    {campingForm.foto_url ? (
                      <img src={campingForm.foto_url} alt="Preview" className="h-20 w-20 rounded-xl object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 text-2xl">🏕️</div>
                    )}
                    <div className="flex flex-col gap-2">
                      <label className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                        Subir imagen
                        <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                      </label>
                      {campingForm.foto_url && (
                        <button type="button" onClick={() => setCampingForm(p => ({ ...p, foto_url: null }))} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">
                          Quitar foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mapa picker */}
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ubicación en el mapa</label>
                  <p className="mb-2 text-xs text-slate-400">
                    {campingForm.latitud && campingForm.longitud
                      ? `Lat: ${campingForm.latitud.toFixed(6)}, Lng: ${campingForm.longitud.toFixed(6)}`
                      : 'Hacé click en el mapa para seleccionar la ubicación'}
                  </p>
                  <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height: 260 }}>
                    <MapContainer
                      center={campingForm.latitud && campingForm.longitud ? [campingForm.latitud, campingForm.longitud] : [-32.0, -64.0]}
                      zoom={campingForm.latitud ? 13 : 5}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                      <MapClickHandler onSelect={(lat, lng) => setCampingForm(p => ({ ...p, latitud: lat, longitud: lng }))} />
                      {campingForm.latitud && campingForm.longitud && (
                        <Marker position={[campingForm.latitud, campingForm.longitud]} />
                      )}
                    </MapContainer>
                  </div>
                  {campingForm.latitud && campingForm.longitud && (
                    <button type="button" onClick={() => setCampingForm(p => ({ ...p, latitud: null, longitud: null }))} className="mt-1 text-xs text-slate-400 hover:text-red-500">
                      Limpiar ubicación
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveCamping}
                  disabled={isSavingCamping}
                  className="mt-5 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSavingCamping ? 'Guardando…' : activeCampingId ? 'Actualizar camping' : 'Crear camping'}
                </button>
              </div>
            </div>

            {/* Columna derecha: Lista de campings */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-800">Campings registrados</h2>
                  <button type="button" onClick={resetCampingForm} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700">
                    + Nuevo
                  </button>
                </div>

                {isLoadingCampings ? (
                  <div className="flex justify-center py-8">
                    <div className="h-7 w-7 animate-spin rounded-full border-3 border-primary-600 border-t-transparent" />
                  </div>
                ) : campingsList.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">No hay campings registrados</p>
                ) : (
                  <div className="space-y-2">
                    {campingsList.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => loadCampingToForm(c)}
                        className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${activeCampingId === c.id ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          {c.foto_url ? (
                            <img src={c.foto_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-lg">🏕️</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{c.nombre}</p>
                            <p className="text-xs text-slate-500 truncate">{c.localidad ?? c.provincia ?? '—'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                              {c.activo ? 'Activo' : 'Inactivo'}
                            </span>
                            {c.latitud && <span className="text-[9px] text-slate-400">📍 Ubicado</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB PERSONAS ══════════════ */}
        {activeTab === 'personas' && (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">

          {/* ── Columna izquierda: Formulario ── */}
          <div className="flex flex-col gap-5">

            {/* Datos base de persona */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Alta / edición de persona</h2>
              <p className="mt-1 text-sm text-slate-500">Buscá por DNI para cargar datos existentes o completá para crear una nueva persona.</p>

              {/* DNI */}
              <div className="mt-5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">DNI *</label>
                <div className={`mt-2 flex overflow-hidden rounded-xl border bg-slate-50 ${formErrors.dni ? 'border-red-400' : 'border-slate-200'}`}>
                  <input
                    className="w-full bg-transparent px-4 py-2 text-sm outline-none"
                    placeholder="12345678"
                    value={formData.persona.dni}
                    onChange={e => { setPersonaField('dni', e.target.value); setFormErrors(p => { const n = { ...p }; delete n.dni; return n; }); }}
                    onKeyDown={e => e.key === 'Enter' && handleBuscarPorDni()}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={handleBuscarPorDni}
                    disabled={isLoadingPersona}
                    className="border-l border-slate-200 bg-white px-4 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isLoadingPersona ? '…' : '🔍'}
                  </button>
                </div>
                {formErrors.dni && <p className="mt-1 text-xs text-red-600">{formErrors.dni}</p>}
              </div>

              {/* QR (solo lectura) */}
              {personaDetail?.persona.qr_code && (
                <div className="mt-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">QR Code (permanente)</label>
                  <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500 break-all">{personaDetail.persona.qr_code}</p>
                </div>
              )}

              {/* Campos editables */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Apellido', field: 'apellido', placeholder: 'Pérez' },
                  { label: 'Nombres', field: 'nombres', placeholder: 'Juan' },
                  { label: 'Email', field: 'email', placeholder: 'mail@ejemplo.com' },
                  { label: 'Teléfono', field: 'telefono', placeholder: '351-555-1234' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
                      placeholder={placeholder}
                      value={(formData.persona as any)[field]}
                      onChange={e => setPersonaField(field, e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sexo</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
                    value={formData.persona.sexo}
                    onChange={e => setPersonaField('sexo', e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="X">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha de nacimiento</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
                    value={formData.persona.fecha_nacimiento}
                    onChange={e => setPersonaField('fecha_nacimiento', e.target.value)}
                  />
                </div>
              </div>

            </div>

            {/* ── Sección: Afiliado ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <SectionHeader
                label="Afiliado sindical"
                section="afiliado"
                badge={personaDetail?.afiliado ? personaDetail.afiliado.situacion_sindicato ?? 'AFILIADO' : undefined}
              />
              {openSections.afiliado && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">CUIL *</label>
                    <input
                      className={`mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-400 ${formErrors.cuil ? 'border-red-400' : 'border-slate-200'}`}
                      placeholder="20123456789"
                      value={formData.afiliado.cuil}
                      onChange={e => { setAfiliadoField('cuil', e.target.value); setFormErrors(p => { const n = { ...p }; delete n.cuil; return n; }); }}
                    />
                    {formErrors.cuil && <p className="mt-1 text-xs text-red-600">{formErrors.cuil}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sexo</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.sexo}
                      onChange={e => setAfiliadoField('sexo', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="X">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situación sindicato</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.situacion_sindicato}
                      onChange={e => setAfiliadoField('situacion_sindicato', e.target.value)}
                    >
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="BAJA">BAJA</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situación obra social</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.situacion_obra_social}
                      onChange={e => setAfiliadoField('situacion_obra_social', e.target.value)}
                    >
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="BAJA">BAJA</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo afiliado</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      placeholder="Activo, Jubilado..."
                      value={formData.afiliado.tipo_afiliado}
                      onChange={e => setAfiliadoField('tipo_afiliado', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoría</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.categoria}
                      onChange={e => setAfiliadoField('categoria', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha nacimiento</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.fecha_nacimiento}
                      onChange={e => setAfiliadoField('fecha_nacimiento', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grupo sanguíneo</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      placeholder="A+, O-..."
                      value={formData.afiliado.grupo_sanguineo}
                      onChange={e => setAfiliadoField('grupo_sanguineo', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Domicilio</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      placeholder="Calle 123"
                      value={formData.afiliado.domicilio}
                      onChange={e => setAfiliadoField('domicilio', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provincia</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.provincia}
                      onChange={e => setAfiliadoField('provincia', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Localidad</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.localidad}
                      onChange={e => setAfiliadoField('localidad', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Código postal</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.codigo_postal}
                      onChange={e => setAfiliadoField('codigo_postal', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa CUIT</label>
                    <input
                      className={`mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm ${formErrors.empresa_cuit ? 'border-red-400' : 'border-slate-200'}`}
                      placeholder="30123456789"
                      value={formData.afiliado.empresa_cuit}
                      onChange={e => { setAfiliadoField('empresa_cuit', e.target.value); setFormErrors(p => { const n = { ...p }; delete n.empresa_cuit; return n; }); }}
                    />
                    {formErrors.empresa_cuit && <p className="mt-1 text-xs text-red-600">{formErrors.empresa_cuit}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa nombre</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.afiliado.empresa_nombre}
                      onChange={e => setAfiliadoField('empresa_nombre', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Foto URL</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      placeholder="https://..."
                      value={formData.afiliado.foto_url}
                      onChange={e => setAfiliadoField('foto_url', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="afiliado-activo"
                      checked={formData.afiliado.activo}
                      onChange={e => setAfiliadoField('activo', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="afiliado-activo" className="text-sm text-slate-600">Afiliado activo</label>
                  </div>
                </div>
              )}
            </div>

            {/* ── Sección: Familiares ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <SectionHeader
                label="Familiares"
                section="familiar"
                badge={(() => {
                  const own = personaDetail?.familiares?.length ?? 0;
                  const grp = personaDetail?.es_familiar_de?.length ?? 0;
                  if (own > 0) return `${own} miembro${own > 1 ? 's' : ''}`;
                  if (grp > 0) return `${grp} grupo${grp > 1 ? 's' : ''}`;
                  return undefined;
                })()}
              />
              {openSections.familiar && (
                <div className="mt-4 space-y-5">

                  {/* Sub-sección A: grupo familiar de este afiliado */}
                  {personaDetail?.afiliado && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Grupo familiar de este afiliado
                        </p>
                        {!familiarToAdd && (
                          <button
                            type="button"
                            onClick={() => setFamiliarToAdd({ dni: '', personaFound: null, needsCreation: false, apellido: '', nombres: '', isBuscando: false, isAdding: false, message: null })}
                            className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                          >
                            + Agregar miembro
                          </button>
                        )}
                      </div>

                      {(personaDetail.familiares?.length ?? 0) === 0 ? (
                        <p className="text-sm text-slate-400">Sin familiares registrados.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                          {personaDetail.familiares!.map(f => {
                            const nombre = f.persona
                              ? (f.persona.nombre_completo || `${f.persona.apellido ?? ''} ${f.persona.nombres ?? ''}`.trim())
                              : `Persona #${f.persona_id ?? '?'}`;
                            return (
                              <div key={f.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                                <div>
                                  <p className="font-semibold text-slate-800">{nombre}</p>
                                  {f.persona?.dni && <p className="text-xs text-slate-500">DNI {f.persona.dni}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${f.baja ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {f.baja ? 'Baja' : 'Activo'}
                                  </span>
                                  {f.persona?.dni && (
                                    <button
                                      type="button"
                                      onClick={() => handleCargarPersonaPorDni(f.persona!.dni)}
                                      className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                      Editar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline form para agregar miembro al grupo */}
                      {familiarToAdd && (
                        <div className="mt-3 rounded-xl border border-primary-100 bg-primary-50 p-4 space-y-3">
                          <p className="text-sm font-semibold text-primary-800">Agregar miembro al grupo</p>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">DNI del familiar *</label>
                            <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <input
                                className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                                placeholder="12345678"
                                value={familiarToAdd.dni}
                                onChange={e => setFamiliarToAdd(prev => prev && { ...prev, dni: e.target.value, personaFound: null, needsCreation: false, message: null })}
                                onKeyDown={e => e.key === 'Enter' && handleVerificarFamiliarDni()}
                                autoComplete="off"
                              />
                              <button
                                type="button"
                                onClick={handleVerificarFamiliarDni}
                                disabled={familiarToAdd.isBuscando}
                                className="border-l border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                              >
                                {familiarToAdd.isBuscando ? '…' : 'Verificar'}
                              </button>
                            </div>
                          </div>

                          {familiarToAdd.message && (
                            <p className={`text-xs ${familiarToAdd.personaFound ? 'text-emerald-700' : familiarToAdd.needsCreation ? 'text-amber-700' : 'text-red-600'}`}>
                              {familiarToAdd.message}
                            </p>
                          )}

                          {familiarToAdd.needsCreation && !familiarToAdd.personaFound && (
                            <div className="grid grid-cols-2 gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <p className="col-span-2 text-xs font-semibold text-amber-800">DNI no registrado — crear persona nueva</p>
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Apellido *</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none"
                                  placeholder="Apellido"
                                  value={familiarToAdd.apellido}
                                  onChange={e => setFamiliarToAdd(prev => prev && { ...prev, apellido: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombres</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none"
                                  placeholder="Nombres"
                                  value={familiarToAdd.nombres}
                                  onChange={e => setFamiliarToAdd(prev => prev && { ...prev, nombres: e.target.value })}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            {(familiarToAdd.personaFound || familiarToAdd.needsCreation) && (
                              <button
                                type="button"
                                onClick={handleAgregarFamiliarAlGrupo}
                                disabled={familiarToAdd.isAdding}
                                className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                              >
                                {familiarToAdd.isAdding ? 'Agregando…' : familiarToAdd.personaFound ? 'Confirmar y agregar' : 'Crear y agregar'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setFamiliarToAdd(null)}
                              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-sección B: esta persona pertenece al grupo de alguien */}
                  {(personaDetail?.es_familiar_de?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Pertenece al grupo familiar de
                      </p>
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                        {personaDetail!.es_familiar_de!.map((fam, i) => {
                          const tit = fam.afiliado_titular;
                          const titNombre = tit?.persona
                            ? (tit.persona.nombre_completo || `${tit.persona.apellido ?? ''} ${tit.persona.nombres ?? ''}`.trim())
                            : `CUIL: ${tit?.cuil}`;
                          return (
                            <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                              <div>
                                <p className="font-semibold text-slate-800">{titNombre}</p>
                                {tit?.persona?.dni && <p className="text-xs text-slate-500">DNI {tit.persona.dni}</p>}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${fam.baja ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                {fam.baja ? 'Baja' : 'Activo'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-sección C: vincular esta persona al grupo de un afiliado (para guardar) */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      {personaDetail?.es_familiar_de?.length ? 'Agregar a otro grupo familiar' : 'Vincular a grupo familiar de un afiliado'}
                    </p>
                    <p className="text-xs text-slate-400 mb-2">Se aplica al guardar. Buscá el DNI del afiliado titular.</p>
                    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <input
                        className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                        placeholder="DNI del afiliado titular"
                        value={formData.familiar.titular_dni}
                        onChange={e => setFamiliarField('titular_dni', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleBuscarTitular()}
                      />
                      <button
                        type="button"
                        onClick={handleBuscarTitular}
                        disabled={isBuscandoTitular}
                        className="border-l border-slate-200 bg-white px-3 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {isBuscandoTitular ? '…' : 'Buscar'}
                      </button>
                    </div>
                    {titularInfo && (
                      <p className="mt-1 text-xs text-emerald-600">✓ {titularInfo.nombre} (DNI {titularInfo.dni})</p>
                    )}
                    {titularInfo && (
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          { field: 'estudia', label: 'Estudia' },
                          { field: 'discapacitado', label: 'Discapacitado' },
                          { field: 'baja', label: 'Baja del grupo' },
                          { field: 'activo', label: 'Activo' },
                        ].map(({ field, label }) => (
                          <label key={field} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(formData.familiar as any)[field]}
                              onChange={e => setFamiliarField(field, e.target.checked)}
                              className="rounded"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* ── Sección: Invitado ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <SectionHeader
                label="Invitado"
                section="invitado"
                badge={personaDetail?.invitado
                  ? (personaDetail.invitado.vigente ? 'Vigente' : 'Vencido')
                  : undefined}
              />
              {openSections.invitado && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vigente desde</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.invitado.vigente_desde}
                      onChange={e => setInvitadoField('vigente_desde', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vigente hasta</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={formData.invitado.vigente_hasta}
                      onChange={e => setInvitadoField('vigente_hasta', e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.invitado.aplica_a_familia}
                      onChange={e => setInvitadoField('aplica_a_familia', e.target.checked)}
                      className="rounded"
                    />
                    Aplica a grupo familiar
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.invitado.activo}
                      onChange={e => setInvitadoField('activo', e.target.checked)}
                      className="rounded"
                    />
                    Activo
                  </label>
                </div>
              )}
            </div>

            {/* ── Botones de acción ── */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGuardarPersona}
                disabled={isSaving || !formData.persona.dni}
                className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-200 hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? 'Guardando…' : (personaId ? 'Guardar cambios' : 'Crear persona')}
              </button>
              {personaId && !personaDetail?.usuario && (
                <button
                  type="button"
                  onClick={handleCrearUsuario}
                  disabled={isCreatingUser}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isCreatingUser ? 'Creando…' : 'Crear usuario (DNI)'}
                </button>
              )}
              {personaDetail?.usuario && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  {isResettingPassword ? 'Reseteando…' : 'Resetear contraseña al DNI'}
                </button>
              )}
            </div>
          </div>

          {/* ── Columna derecha: Búsqueda + Usuario/Roles ── */}
          <div className="space-y-5">

            {/* Búsqueda real */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Buscar personas</h2>
              <p className="mt-1 text-sm text-slate-500">DNI, apellido o nombre.</p>
              <div className="mt-3 flex overflow-hidden rounded-xl border border-slate-200">
                <input
                  className="w-full bg-slate-50 px-4 py-2 text-sm outline-none"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="flex items-center border-l border-slate-200 bg-white px-3 text-slate-400">
                  {isSearching ? '…' : '🔍'}
                </div>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-3 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.persona.id}
                      type="button"
                      onClick={() => handleSelectResult(item)}
                      className="flex w-full items-center justify-between py-3 text-left text-sm hover:bg-slate-50 px-1 rounded"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.persona.nombre_completo || `${item.persona.apellido ?? ''} ${item.persona.nombres ?? ''}`.trim() || item.persona.dni}
                        </p>
                        <p className="text-xs text-slate-500">
                          DNI {item.persona.dni}
                          {item.tipos.length > 0 && ` • ${item.tipos.join(', ')}`}
                        </p>
                      </div>
                      <span className="text-primary-600 text-xs">Cargar →</span>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="mt-3 text-sm text-slate-400">Sin resultados para "{searchQuery}"</p>
              )}
            </div>

            {/* Usuario y roles */}
            {personaDetail?.usuario && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Usuario</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Username</span>
                    <span className="font-mono font-semibold">{personaDetail.usuario.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estado</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${personaDetail.usuario.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {personaDetail.usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {personaDetail.usuario.must_change_password && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Debe cambiar la contraseña al próximo ingreso.
                    </div>
                  )}
                  {personaDetail.usuario.ultimo_acceso && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Último acceso</span>
                      <span className="text-slate-700">{new Date(personaDetail.usuario.ultimo_acceso).toLocaleDateString('es-AR')}</span>
                    </div>
                  )}
                </div>

                {/* Roles actuales */}
                {(personaDetail.roles?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Roles asignados</p>
                    <div className="space-y-1">
                      {personaDetail.roles!.map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                          <span className="font-semibold capitalize">{r.nombre ?? `Rol #${r.id}`}</span>
                          {r.camping && <span className="text-slate-500">{r.camping.nombre}</span>}
                          <span className={`rounded-full px-1.5 py-0.5 ${r.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                            {r.activo ? 'activo' : 'inactivo'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asignar nuevo rol */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Asignar rol</p>
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={rolParaAsignar.rolId}
                      onChange={e => setRolParaAsignar(p => ({ ...p, rolId: e.target.value, campingId: '' }))}
                    >
                      <option value="">Seleccionar rol...</option>
                      {catalogo.roles.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    {esOperador && (
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        value={rolParaAsignar.campingId}
                        onChange={e => setRolParaAsignar(p => ({ ...p, campingId: e.target.value }))}
                      >
                        <option value="">Seleccionar camping (requerido para operador)...</option>
                        {catalogo.campings.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={handleAsignarRol}
                      disabled={isAsignandoRol || !rolParaAsignar.rolId || (esOperador && !rolParaAsignar.campingId)}
                      className="w-full rounded-xl bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {isAsignandoRol ? 'Asignando…' : 'Asignar rol'}
                    </button>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
