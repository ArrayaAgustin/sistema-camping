import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, Users, Clock, LogOut, Settings, UserCheck } from 'lucide-react';

interface Afiliado {
  id: number;
  numero_afiliado: string;
  dni: string;
  apellido: string;
  nombres: string;
  email: string | null;
  telefono: string | null;
}

interface PeriodoCaja {
  id: number;
  camping_id: number;
  usuario_id: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  total_visitas: number;
  estado: string;
  observaciones: string;
  usuario?: {
    id: number;
    username: string;
  };
}

interface EstadisticasHoy {
  visitasHoy: number;
  afiliadosActivos: number;
  ultimaVisita: string | null;
}

const Dashboard: React.FC = () => {
  const { user, logout, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const [selectedAfiliado, setSelectedAfiliado] = useState<Afiliado | null>(null);
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoCaja | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasHoy>({
    visitasHoy: 0,
    afiliadosActivos: 0,
    ultimaVisita: null
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<any[]>([]);
  const [selectedAfiliadoForVisit, setSelectedAfiliadoForVisit] = useState<Afiliado | null>(null);

  // Cargar período activo y estadísticas al inicializar
  useEffect(() => {
    loadPeriodoActivo();
  }, []);

  // Cargar estadísticas cuando el período activo cambie
  useEffect(() => {
    if (periodoActivo) {
      loadEstadisticas();
    }
  }, [periodoActivo]);

  const loadPeriodoActivo = async () => {
    try {
      console.log('🔍 Cargando período activo...');
      console.log('Token:', token);
      
      const response = await fetch('/api/periodos-caja/activo?camping_id=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Datos recibidos:', data);
        
        // La estructura real es data.periodo directamente
        const periodo = data.periodo || null;
        console.log('🎯 Período extraído:', periodo);
        console.log('🔢 Total visitas en período:', periodo?.total_visitas);
        
        setPeriodoActivo(periodo);
        
        if (periodo) {
          console.log('✅ Período activo cargado:', periodo.id);
          console.log('📊 Total visitas del período:', periodo.total_visitas);
          console.log('📅 Fecha apertura:', periodo.fecha_apertura);
        } else {
          console.log('❌ No se encontró período activo');
        }
      } else {
        console.error('❌ Error HTTP:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('💥 Error cargando período activo:', error);
    }
  };

  const loadEstadisticas = async () => {
    try {
      // Si hay período activo, usar la fecha de apertura del período
      let fechaConsulta = new Date().toISOString().split('T')[0]; // Por defecto, hoy
      
      if (periodoActivo && periodoActivo.fecha_apertura) {
        fechaConsulta = new Date(periodoActivo.fecha_apertura).toISOString().split('T')[0];
        console.log('📅 Usando fecha del período:', fechaConsulta);
      } else {
        console.log('📅 Usando fecha actual:', fechaConsulta);
      }
      
      const response = await fetch(`/api/visitas/dia?camping_id=1&fecha=${fechaConsulta}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const visitas = await response.json();
        console.log('📊 Visitas del día:', visitas);
        console.log('📊 Cantidad de visitas encontradas:', visitas.length);
        console.log('📊 Primera visita:', visitas[0]);
        
        setEstadisticas({
          visitasHoy: visitas.length,
          afiliadosActivos: 1247, // Este podría ser otro endpoint
          ultimaVisita: visitas.length > 0 ? visitas[visitas.length - 1].fecha_ingreso : null
        });
        
        console.log('✅ Estadísticas actualizadas - Visitas hoy:', visitas.length);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // Fallback con datos simulados
      setEstadisticas({
        visitasHoy: 0,
        afiliadosActivos: 1247,
        ultimaVisita: null
      });
    }
  };

  // Datos de prueba para continuar el desarrollo
  const getMockAfiliados = (query: string) => {
    const mockData = [
      {
        id: 1,
        cuil: "20332516540",
        dni: "33251654", 
        apellido: "ANDRADA",
        nombres: "GABRIEL OSCAR",
        numeroAfiliado: "20332516540",
        numero_afiliado: "20332516540",
        documento: "33251654",
        sexo: "M",
        tipo_afiliado: "SMATA y OSMATA",
        fecha_nacimiento: "1987-09-12T00:00:00.000Z",
        categoria: "TRABAJANDO, APORTA POR DGI",
        situacion_sindicato: "ACTIVO",
        situacion_obra_social: "ACTIVO",
        domicilio: "AV.RENAULT 1020",
        provincia: "Córdoba",
        localidad: "CORDOBA",
        email: null,
        telefono: null,
        activo: true,
        Familiares: [
          {
            id: 1,
            nombre: "MARÍA JOSÉ ANDRADA",
            dni: "34123456",
            fecha_nacimiento: "1990-03-15T00:00:00.000Z",
            edad: 34,
            estudia: false,
            discapacitado: false,
            activo: true
          },
          {
            id: 2,
            nombre: "LUCAS ANDRADA",
            dni: "45987654",
            fecha_nacimiento: "2010-08-20T00:00:00.000Z",
            edad: 14,
            estudia: true,
            discapacitado: false,
            activo: true
          }
        ]
      },
      {
        id: 4,
        cuil: "20332856244",
        dni: "33285624",
        apellido: "FRIDLMEIER", 
        nombres: "ANDRES FRANCISCO",
        numeroAfiliado: "20332856244",
        numero_afiliado: "20332856244",
        documento: "33285624",
        sexo: "M",
        tipo_afiliado: "SMATA",
        categoria: "TRABAJANDO, APORTA POR DGI",
        situacion_sindicato: "ACTIVO",
        situacion_obra_social: "BAJA",
        domicilio: "AV. RENAULT 1020",
        provincia: "Córdoba",
        localidad: "CORDOBA",
        email: "andresfrid@gmail.com",
        telefono: null,
        activo: true
      }
    ];

    const filtered = mockData.filter(afiliado => 
      afiliado.apellido.toLowerCase().includes(query.toLowerCase()) ||
      afiliado.nombres.toLowerCase().includes(query.toLowerCase()) ||
      afiliado.dni.includes(query) ||
      afiliado.numero_afiliado.includes(query)
    );

    return filtered;
  };

  const searchAfiliados = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setAfiliados([]);
      return;
    }

    console.log('🔍 Buscando afiliados:', query);
    setSearchLoading(true);
    
    try {
      // Primero intentar con la API real
      const url = `/api/afiliados?q=${encodeURIComponent(query)}&tipo=general&limit=10`;
      console.log('📡 URL de búsqueda:', url);
      console.log('🔑 Token siendo usado:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionó! Datos:', data);
        let afiliados = data.data || [];
        
        // Si encontramos afiliados pero sin familiares, agregar familiares mock para demostración
        afiliados = afiliados.map((afiliado: any) => {
          if ((!afiliado.Familiares || afiliado.Familiares.length === 0) && 
              afiliado.apellido?.toUpperCase().includes('ANDRADA')) {
            console.log('🎭 Agregando familiares mock a:', afiliado.apellido);
            return {
              ...afiliado,
              Familiares: [
                {
                  id: `mock-1-${afiliado.id}`,
                  nombre: "MARÍA JOSÉ ANDRADA",
                  dni: "34567890",
                  fecha_nacimiento: "1990-05-15T00:00:00.000Z",
                  edad: 34,
                  estudia: false,
                  discapacitado: false,
                  activo: true
                },
                {
                  id: `mock-2-${afiliado.id}`,
                  nombre: "LUCAS ANDRADA",
                  dni: "45987654",
                  fecha_nacimiento: "2010-08-20T00:00:00.000Z",
                  edad: 14,
                  estudia: true,
                  discapacitado: false,
                  activo: true
                },
                {
                  id: `mock-3-${afiliado.id}`,
                  nombre: "SOFIA ANDRADA",
                  dni: "50123456",
                  fecha_nacimiento: "2015-03-10T00:00:00.000Z",
                  edad: 9,
                  estudia: true,
                  discapacitado: false,
                  activo: true
                }
              ]
            };
          }
          return afiliado;
        });
        
        setAfiliados(afiliados);
      } else {
        throw new Error(`API failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('💥 Error con API, usando datos mock:', error);
      
      // Usar datos mock como fallback
      const mockAfiliados = getMockAfiliados(query);
      console.log('🎭 Usando datos mock:', mockAfiliados);
      setAfiliados(mockAfiliados);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // No buscar automáticamente, solo actualizar el query
  };

  const handleSearchButton = () => {
    if (searchQuery.trim()) {
      searchAfiliados(searchQuery.trim());
    }
  };

  const registrarVisita = async (afiliado: Afiliado) => {
    // Verificar que hay un período activo
    if (!periodoActivo) {
      alert('❌ Debe abrir un período de caja antes de registrar ingresos');
      return;
    }

    // Guardar afiliado seleccionado y mostrar modal de familia
    setSelectedAfiliadoForVisit(afiliado);
    
    // Inicializar lista familiar (titular siempre seleccionado + familiares)
    const familiares = afiliado.Familiares || [];
    const familiaCompleta = [
      {
        id: `titular-${afiliado.id}`,
        nombre: `${afiliado.apellido}, ${afiliado.nombres}`,
        dni: afiliado.dni,
        edad: null,
        tipo: 'titular',
        selected: true // Titular siempre seleccionado
      },
      ...familiares.map((fam: any) => ({
        ...fam,
        tipo: 'familiar',
        selected: false
      }))
    ];
    
    setSelectedFamily(familiaCompleta);
    setShowFamilyModal(true);
  };

  const procesarIngresoFamiliar = async () => {
    try {
      const personasSeleccionadas = selectedFamily.filter(p => p.selected);
      
      if (personasSeleccionadas.length === 0) {
        alert('⚠️ Debe seleccionar al menos al titular para registrar el ingreso');
        return;
      }
      
      const observaciones = prompt('Observaciones (opcional):');
      
      // Separar titular de acompañantes
      const titular = personasSeleccionadas.find(p => p.tipo === 'titular');
      const acompanantes = personasSeleccionadas.filter(p => p.tipo === 'familiar');
      
      console.log('🎯 Registrando visita:', {
        afiliado_id: selectedAfiliadoForVisit?.id,
        titular: titular?.nombre,
        acompanantes: acompanantes.map(a => a.nombre),
        total: personasSeleccionadas.length
      });

      const requestBody = {
        afiliado_id: selectedAfiliadoForVisit?.id,
        camping_id: 1,
        periodo_caja_id: periodoActivo?.id,
        acompanantes: acompanantes.map(a => ({
          nombre: a.nombre,
          edad: a.edad || 0,
          dni: a.dni || null
        })),
        observaciones: observaciones || `Ingreso grupal: ${personasSeleccionadas.length} personas`,
        registro_offline: false
      };

      console.log('📤 Enviando datos:', requestBody);
      console.log('🔑 Token:', token ? 'Presente' : 'Ausente');
      
      const response = await fetch('/api/visitas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Respuesta exitosa:', result);
        
        alert(`✅ Ingreso registrado exitosamente!\n\n` +
          `👤 ${titular?.nombre}\n` + 
          `👥 ${acompanantes.length} acompañantes\n` +
          `🎯 Total: ${personasSeleccionadas.length} personas\n` +
          `🆔 ID Visita: ${result.visita_id || 'N/A'}`);
        
        // Limpiar estado
        setShowFamilyModal(false);
        setSelectedAfiliadoForVisit(null);
        setSelectedFamily([]);
        setSelectedAfiliado(null);
        setSearchQuery('');
        setAfiliados([]);
        
        // Actualizar estadísticas
        loadEstadisticas();
        loadPeriodoActivo();
      } else if (response.status === 401) {
        alert('🔐 Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        // Limpiar token y redirigir al login
        localStorage.removeItem('token');
        window.location.reload();
      } else {
        const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('❌ Error del servidor:', error);
        alert(`❌ Error del servidor: ${error.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error registrando visita:', error);
      if (error.message === 'Failed to fetch') {
        alert('❌ Error de conexión: Verifique que el servidor esté funcionando');
      } else {
        alert(`❌ Error inesperado: ${error.message}`);
      }
    }
  };

  const toggleFamilyMember = (index: number) => {
    const updatedFamily = [...selectedFamily];
    if (updatedFamily[index].tipo !== 'titular') {
      updatedFamily[index].selected = !updatedFamily[index].selected;
      setSelectedFamily(updatedFamily);
    }
  };

  const verVisitasHoy = async () => {
    try {
      // Usar la fecha del período activo si existe, sino la fecha actual
      let fechaConsulta = new Date().toISOString().split('T')[0];
      
      if (periodoActivo && periodoActivo.fecha_apertura) {
        fechaConsulta = new Date(periodoActivo.fecha_apertura).toISOString().split('T')[0];
      }
      
      const response = await fetch(`/api/visitas/dia?camping_id=1&fecha=${fechaConsulta}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const visitas = await response.json();
        console.log('📋 Visitas de hoy:', visitas);
        
        if (visitas.length === 0) {
          alert('📋 No hay ingresos registrados hoy');
          return;
        }

        const visitasTexto = visitas.map((v: any) => 
          `• ${v.Afiliado?.apellido || 'N/A'}, ${v.Afiliado?.nombres || 'N/A'} - ${new Date(v.fecha_ingreso).toLocaleTimeString()}`
        ).join('\n');
        
        alert(`📋 Ingresos de hoy (${visitas.length}):\n\n${visitasTexto}`);
      } else {
        alert('❌ No se pudieron cargar las visitas de hoy');
      }
    } catch (error) {
      console.error('Error cargando visitas:', error);
      alert('❌ Error de conexión');
    }
  };

  const abrirPeriodo = async () => {
    try {
      // Primero verificar si ya hay un período activo
      await loadPeriodoActivo();
      if (periodoActivo) {
        alert('⚠️ Ya existe un período de caja activo. Debe cerrarlo antes de abrir uno nuevo.');
        return;
      }

      const observaciones = prompt('Observaciones del período:', 'Inicio de actividades');
      if (observaciones === null) return;

      const response = await fetch('/api/periodos-caja/abrir', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          camping_id: 1,
          observaciones: observaciones
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPeriodoActivo(data.periodo || data.data?.periodo);
        alert('✅ Período de caja abierto correctamente');
      } else {
        // Manejar errores específicos
        if (data.error && data.error.includes('Ya existe un período')) {
          alert('⚠️ Ya existe un período de caja activo en este camping');
          // Recargar para mostrar el período existente
          await loadPeriodoActivo();
        } else {
          alert(`❌ Error: ${data.error || data.message || 'Error desconocido'}`);
        }
      }
    } catch (error) {
      console.error('Error abriendo período:', error);
      alert('❌ Error de conexión al abrir período');
    }
  };

  const cerrarPeriodo = async () => {
    if (!periodoActivo) return;
    
    const confirmacion = confirm(`¿Está seguro que desea cerrar el período de caja?\n\nTotal de visitas registradas: ${periodoActivo.total_visitas}`);
    if (!confirmacion) return;

    try {
      const observaciones = prompt('Observaciones del cierre (opcional):');
      
      const response = await fetch(`/api/periodos-caja/${periodoActivo.id}/cerrar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          observaciones_cierre: observaciones || 'Cierre de período'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPeriodoActivo(null);
        alert('✅ Período de caja cerrado correctamente');
        loadEstadisticas();
      } else {
        alert(`❌ Error al cerrar período: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Error cerrando período:', error);
      alert('❌ Error de conexión al cerrar período');
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🏕️ Sistema Camping SMATA</h1>
          <span className="user-info">👤 {user?.username}</span>
        </div>
        
        <div className="header-right">
          <div className="status-indicators">
            {periodoActivo ? (
              <span className="status periodo-abierto">
                <Clock size={16} /> Período Abierto
              </span>
            ) : (
              <span className="status periodo-cerrado">
                <Clock size={16} /> Sin Período
              </span>
            )}
            <span className="status visitas-hoy">
              👥 {estadisticas.visitasHoy} ingresos hoy
            </span>
          </div>
          
          <button onClick={logout} className="logout-btn">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="dashboard-main">
        {/* Control de Período */}
        <div className="periodo-control">
          {periodoActivo ? (
            <div className="periodo-info">
              <h3>📋 Período Activo</h3>
              <div className="periodo-details">
                <p><strong>Abierto:</strong> {new Date(periodoActivo.fecha_apertura).toLocaleString()}</p>
                <p><strong>Total visitas:</strong> {periodoActivo.total_visitas}</p>
                <p><strong>Observaciones:</strong> {periodoActivo.observaciones}</p>
                {periodoActivo.usuario && (
                  <p><strong>Usuario:</strong> {periodoActivo.usuario.username}</p>
                )}
              </div>
              <div className="periodo-actions">
                <button onClick={cerrarPeriodo} className="btn btn-danger">
                  Cerrar Período
                </button>
              </div>
            </div>
          ) : (
            <div className="periodo-info">
              <h3>❌ Sin Período Activo</h3>
              <p>Debe abrir un período de caja para comenzar a registrar ingresos</p>
              <button onClick={abrirPeriodo} className="btn btn-primary">
                Abrir Período de Caja
              </button>
            </div>
          )}
        </div>

        {/* Estadísticas del Camping */}
        <div className="camping-stats">
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-number">{estadisticas.visitasHoy}</div>
                <div className="stat-label">Ingresos Hoy</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{estadisticas.afiliadosActivos}</div>
                <div className="stat-label">Afiliados Activos</div>
              </div>
            </div>
            
            <div className="stat-card clickable" onClick={verVisitasHoy}>
              <div className="stat-icon">🕐</div>
              <div className="stat-content">
                <div className="stat-number">
                  {estadisticas.ultimaVisita 
                    ? new Date(estadisticas.ultimaVisita).toLocaleTimeString()
                    : '--:--'
                  }
                </div>
                <div className="stat-label">Último Ingreso</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-container">
            <div className="search-input-group">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar afiliado por apellido, nombre, DNI o número..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchButton()}
                className="search-input"
              />
              <button 
                onClick={handleSearchButton}
                disabled={!searchQuery.trim() || searchLoading}
                className="btn btn-primary search-btn"
              >
                {searchLoading ? '🔄' : '🔍'} Buscar
              </button>
            </div>
            
            {searchLoading && (
              <div className="search-loading">🔄 Buscando...</div>
            )}

            {/* Results */}
            {afiliados.length > 0 && (
              <div className="search-results">
                {console.log('🎨 Renderizando', afiliados.length, 'afiliados')}
                {afiliados.map((afiliado) => (
                  <div
                    key={afiliado.id}
                    className={`afiliado-item ${selectedAfiliado?.id === afiliado.id ? 'selected' : ''}`}
                    onClick={() => setSelectedAfiliado(afiliado)}
                  >
                    <div className="afiliado-info">
                      <div className="afiliado-name">
                        <strong>{afiliado.apellido}, {afiliado.nombres}</strong>
                      </div>
                      <div className="afiliado-details">
                        <span>📋 {afiliado.numero_afiliado}</span>
                        <span>🆔 {afiliado.dni}</span>
                        {afiliado.email && <span>📧 {afiliado.email}</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        registrarVisita(afiliado);
                      }}
                      className="btn btn-success btn-sm"
                      disabled={!periodoActivo}
                      title={!periodoActivo ? 'Debe abrir un período primero' : 'Registrar ingreso al camping'}
                    >
                      <UserCheck size={16} /> Ingresar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searchLoading && afiliados.length === 0 && (
              <div className="no-results">
                <Users size={48} />
                <p>No se encontraron afiliados</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Afiliado Details */}
        {selectedAfiliado && (
          <div className="selected-afiliado">
            <h3>👤 Afiliado Seleccionado</h3>
            <div className="afiliado-card">
              <div className="afiliado-header">
                <strong>{selectedAfiliado.apellido}, {selectedAfiliado.nombres}</strong>
              </div>
              <div className="afiliado-body">
                <p><strong>Número:</strong> {selectedAfiliado.numero_afiliado}</p>
                <p><strong>DNI:</strong> {selectedAfiliado.dni}</p>
                {selectedAfiliado.email && <p><strong>Email:</strong> {selectedAfiliado.email}</p>}
                {selectedAfiliado.telefono && <p><strong>Teléfono:</strong> {selectedAfiliado.telefono}</p>}
              </div>
              <div className="afiliado-actions">
                <button
                  onClick={() => registrarVisita(selectedAfiliado)}
                  className="btn btn-success"
                  disabled={!periodoActivo}
                  title={!periodoActivo ? 'Debe abrir un período primero' : 'Registrar ingreso al camping'}
                >
                  <UserCheck size={16} /> Registrar Ingreso
                </button>
                <button
                  onClick={() => setSelectedAfiliado(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Selección Familiar */}
      {showFamilyModal && selectedAfiliadoForVisit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              textAlign: 'center',
              marginBottom: '20px',
              color: '#2563eb',
              fontSize: '24px'
            }}>
              🎪 SELECCIÓN DE INGRESO
            </h2>
            
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <strong>Afiliado: {selectedAfiliadoForVisit.apellido}, {selectedAfiliadoForVisit.nombres}</strong><br/>
              <span style={{ color: '#6b7280' }}>DNI: {selectedAfiliadoForVisit.dni}</span>
            </div>

            <h3 style={{ marginBottom: '15px', color: '#374151' }}>
              👨‍👩‍👧‍👦 Seleccione quiénes ingresan al camping:
            </h3>

            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {selectedFamily.map((persona, index) => (
                <div
                  key={persona.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    borderBottom: index < selectedFamily.length - 1 ? '1px solid #f3f4f6' : 'none',
                    backgroundColor: persona.selected ? '#dbeafe' : 'transparent',
                    borderRadius: '6px',
                    margin: '2px 0',
                    cursor: persona.tipo === 'titular' ? 'default' : 'pointer'
                  }}
                  onClick={() => toggleFamilyMember(index)}
                >
                  <input
                    type="checkbox"
                    checked={persona.selected}
                    disabled={persona.tipo === 'titular'}
                    onChange={() => toggleFamilyMember(index)}
                    style={{
                      marginRight: '12px',
                      transform: 'scale(1.2)',
                      cursor: persona.tipo === 'titular' ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: persona.tipo === 'titular' ? 'bold' : 'normal',
                      color: persona.tipo === 'titular' ? '#1f2937' : '#374151'
                    }}>
                      {persona.tipo === 'titular' ? '👤 ' : '👥 '}
                      {persona.nombre}
                    </div>
                    {persona.edad && (
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Edad: {persona.edad} años
                      </div>
                    )}
                    {persona.dni && persona.dni !== selectedAfiliadoForVisit.dni && (
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        DNI: {persona.dni}
                      </div>
                    )}
                  </div>
                  {persona.tipo === 'titular' && (
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      (Obligatorio)
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              backgroundColor: '#f9fafb',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <strong>Total seleccionados: {selectedFamily.filter(p => p.selected).length} personas</strong>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowFamilyModal(false);
                  setSelectedAfiliadoForVisit(null);
                  setSelectedFamily([]);
                }}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ❌ Cancelar
              </button>
              <button
                onClick={procesarIngresoFamiliar}
                disabled={selectedFamily.filter(p => p.selected).length === 0}
                style={{
                  backgroundColor: selectedFamily.filter(p => p.selected).length > 0 ? '#059669' : '#d1d5db',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedFamily.filter(p => p.selected).length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '16px'
                }}
              >
                ✅ Confirmar Ingreso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;