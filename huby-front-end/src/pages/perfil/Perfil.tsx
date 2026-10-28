import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { Navbar } from '../../components/navbar/Navbar';
import './Perfil.css';

interface UsuarioData {
  id: string;
  login: string;
  nomeExibicao: string;
  username: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  instagram: string;
  discord: string;
  twitter: string;
  tiktok: string;
  steam: string;
  itchIo: string;
  seguindo?: string[];
  seguidores?: string[];
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9));
}

export function Perfil() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); 
  const [loggedUser, setLoggedUser] = useState<UsuarioData | null>(null);
  const [perfilData, setPerfilData] = useState<UsuarioData | null>(null);
  const isOwner = !id || (loggedUser && id === loggedUser.id);

  const [editandoBio, setEditandoBio] = useState(false);
  const [editandoRedes, setEditandoRedes] = useState(false);
  const [editandoMidia, setEditandoMidia] = useState(false);
  const [editandoIdentidade, setEditandoIdentidade] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'publicados' | 'criados' | 'participados'>('publicados');
  const [salvando, setSalvando] = useState(false);

  const [gavetaAberta, setGavetaAberta] = useState<boolean | null>(null);
  const [todosUsuarios, setTodosUsuarios] = useState<UsuarioData[]>([]);
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);

  const [imagemParaCortar, setImagemParaCortar] = useState<string | null>(null);
  const [tipoCrop, setTipoCrop] = useState<'avatarUrl' | 'bannerUrl'>('avatarUrl');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;


  useEffect(() => {
    const dadosSalvos = localStorage.getItem('huby_user');
    if (!dadosSalvos) {
      navigate('/login');
      return;
    }
    const usuarioLocal = JSON.parse(dadosSalvos);
    setLoggedUser(usuarioLocal);

    fetch(`http://localhost:8080/api/perfil/${usuarioLocal.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((usuarioDaNuvem) => {
        if (usuarioDaNuvem) {
          setLoggedUser(usuarioDaNuvem);
          localStorage.setItem('huby_user', JSON.stringify(usuarioDaNuvem));
        }
      })
      .catch((err) => console.error(err));
  }, [navigate]);

 
  useEffect(() => {
    if (!loggedUser) return;

    if (isOwner) {
 
      setPerfilData(loggedUser);
    } else {
      fetch(`http://localhost:8080/api/perfil/${id}`)
        .then(res => res.json())
        .then(data => setPerfilData(data))
        .catch(err => console.error("Erro ao buscar perfil de outro usuário", err));
    }
  }, [id, loggedUser, isOwner]);

  useEffect(() => {
    if (gavetaAberta) {
      fetch('http://localhost:8080/api/usuarios')
        .then((res) => (res.ok ? res.json() : []))
        .then((lista) => setTodosUsuarios(lista));
    }
  }, [gavetaAberta]);

  async function salvarNoBanco(novosDados: Partial<UsuarioData>) {
    if (!loggedUser || !isOwner) return; 
    setSalvando(true);
    const payload = { ...loggedUser, ...novosDados };

    try {
      const resposta = await fetch(`http://localhost:8080/api/perfil/${loggedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resposta.ok) {
        const atualizado = await resposta.json();
        setLoggedUser(atualizado);
        localStorage.setItem('huby_user', JSON.stringify(atualizado));
        window.dispatchEvent(new Event('huby_avatar_atualizado'));
        setEditandoBio(false);
        setEditandoRedes(false);
        setEditandoMidia(false);
        setEditandoIdentidade(false);
      }
    } catch (error) { console.error(error); } finally { setSalvando(false); }
  }

  async function handleAlternarSeguir(alvoId: string) {
    if (!loggedUser) return;
    try {
      const resposta = await fetch(`http://localhost:8080/api/perfil/${loggedUser.id}/seguir/${alvoId}`, { method: 'POST' });
      if (resposta.ok) {
        const euAtualizado = await resposta.json();
        const jaSeguia = loggedUser.seguindo?.includes(alvoId);
        
        setLoggedUser(euAtualizado);
        localStorage.setItem('huby_user', JSON.stringify(euAtualizado));

        if (!isOwner && perfilData && perfilData.id === alvoId) {
          setPerfilData(prev => {
            if (!prev) return prev;
            const novosSeguidores = jaSeguia 
              ? (prev.seguidores || []).filter(sId => sId !== loggedUser.id)
              : [...(prev.seguidores || []), loggedUser.id];
            return { ...prev, seguidores: novosSeguidores };
          });
        }
      }
    } catch (error) { console.error(error); }
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'avatarUrl' | 'bannerUrl') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
      setTipoCrop(tipo);
      setImagemParaCortar(imageDataUrl);
      setEditandoMidia(false);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUploadCortado = async () => {
    if (!imagemParaCortar || !croppedAreaPixels) return;
    setSalvando(true);
    try {
      const croppedImageBlob = await getCroppedImg(imagemParaCortar, croppedAreaPixels);
      if (!croppedImageBlob) return;
      const formData = new FormData();
      formData.append('file', croppedImageBlob);
      formData.append('upload_preset', uploadPreset);
      const resCloudinary = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const dadosCloudinary = await resCloudinary.json();
      if (dadosCloudinary.secure_url) {
        await salvarNoBanco({ [tipoCrop]: dadosCloudinary.secure_url });
        setImagemParaCortar(null);
      }
    } catch (error) { console.error(error); } finally { setSalvando(false); }
  };

  if (!loggedUser || !perfilData) return null;

  const loggedSigoPerfil = !isOwner && loggedUser.seguindo?.includes(perfilData.id);

  const usuariosFiltrados = todosUsuarios
    .filter((u) => u.id !== loggedUser.id)
    .filter((u) => {
      const termo = buscaUsuario.toLowerCase();
      return (u.nomeExibicao || '').toLowerCase().includes(termo) || (u.username || '').toLowerCase().includes(termo);
    });

  return (
    <>
      <Navbar activeLink="perfil" />
      
      <div className="perfil-wrapper">
      
      {/* MODAL DO CROPPER FICA IGUAL... */}
      {imagemParaCortar && (
        <div className="cropper-modal-overlay">
          <div className="cropper-modal-content">
            <h3>Ajuste sua imagem</h3>
            <div className="cropper-container">
              <Cropper
                image={imagemParaCortar}
                crop={crop}
                zoom={zoom}
                aspect={tipoCrop === 'avatarUrl' ? 1 : 16 / 5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape={tipoCrop === 'avatarUrl' ? 'round' : 'rect'}
              />
            </div>
            <div className="cropper-controls">
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="zoom-slider" />
              <div className="cropper-actions">
                <button className="btn-cancelar" onClick={() => setImagemParaCortar(null)}>Cancelar</button>
                <button className="btn-salvar" onClick={handleUploadCortado} disabled={salvando}>{salvando ? 'Salvando...' : 'Aplicar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAVETA DIREITA (DRAWER) */}
      <aside className={`usuarios-drawer ${gavetaAberta === true ? 'aberta' : gavetaAberta === false ? 'fechando' : ''}`}>
        <button className="drawer-close-tab" onClick={() => setGavetaAberta(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        <div className="drawer-inner">
          <div className="drawer-search-wrap">
            <input type="text" placeholder="Encontre novas pessoas" value={buscaUsuario} onChange={(e) => setBuscaUsuario(e.target.value)} />
          </div>

          <div className="drawer-users-list">
            {usuariosFiltrados.length === 0 ? ( <p className="drawer-empty">Nenhum usuário encontrado.</p> ) : (
              usuariosFiltrados.map((outroUser) => {
                const jaSigo = loggedUser.seguindo?.includes(outroUser.id) || false;
                const nomeExib = outroUser.nomeExibicao || outroUser.login.split('@')[0];
                const arrobaExib = outroUser.username || outroUser.login.split('@')[0];

                return (
                  <div 
                    key={outroUser.id} 
                    className={`drawer-user-pill ${jaSigo ? 'seguindo' : ''}`}
                    onClick={() => {
                      setGavetaAberta(false);
                      navigate(`/perfil/${outroUser.id}`);
                    }}
                  >
                    <div className="drawer-user-left">
                      {outroUser.avatarUrl ? (
                        <img src={outroUser.avatarUrl} alt={nomeExib} className="drawer-user-avatar" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="drawer-user-avatar drawer-avatar-vazio">{nomeExib[0].toUpperCase()}</div>
                      )}
                      <div className="drawer-user-texts">
                        <h4>{nomeExib}</h4><span>@{arrobaExib}</span>
                      </div>
                    </div>

                    <div className="drawer-user-actions">
                      {!jaSigo && (
                        <button 
                          className="drawer-action-btn" 
                          onClick={(e) => { e.stopPropagation(); handleAlternarSeguir(outroUser.id); }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                        </button>
                      )}

                      <div className="dropdown-container">
                        <button 
                          className="drawer-action-btn" 
                          onClick={(e) => { e.stopPropagation(); setMenuAbertoId(menuAbertoId === outroUser.id ? null : outroUser.id); }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="12" cy="19" r="2.2" /></svg>
                        </button>
                        {menuAbertoId === outroUser.id && (
                          <div className="user-options-menu" onMouseLeave={() => setMenuAbertoId(null)} onClick={(e) => e.stopPropagation()}>
                            {jaSigo && (
                              <button onClick={() => { handleAlternarSeguir(outroUser.id); setMenuAbertoId(null); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                                Deixar de Seguir
                              </button>
                            )}
                            <button className="btn-perigo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><line x1="5.7" y1="5.7" x2="18.3" y2="18.3" /></svg> Bloquear</button>
                            <button className="btn-perigo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg> Denunciar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* BANNER SUPERIOR */}
      <div className="perfil-banner" style={perfilData.bannerUrl ? { backgroundImage: `url(${perfilData.bannerUrl})` } : {}}>
        <div className="banner-overlay" />
      </div>

      {/* CABEÇALHO DO USUÁRIO */}
      <div className="perfil-header">
        
        <div className="banner-QuickActions">
          {/* Só mostra botão de Seguir Principal se NÃO for o dono da conta */}
          {!isOwner && (
            <button 
              className={`btn-seguir-perfil ${loggedSigoPerfil ? 'seguindo' : ''}`} 
              onClick={() => handleAlternarSeguir(perfilData.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                {loggedSigoPerfil ? <line x1="23" y1="11" x2="17" y2="11" /> : <><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></>}
              </svg>
              {loggedSigoPerfil ? 'Seguindo' : 'Seguir'}
            </button>
          )}

          {/* Lápis do Banner APENAS SE FOR O DONO */}
          {isOwner && (
            <button className="circle-action-btn" onClick={() => setEditandoMidia(!editandoMidia)}>✎</button>
          )}

          <button className="circle-action-btn" onClick={() => setGavetaAberta(true)} title="Encontrar Pessoas">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </button>
        </div>

        <div className="avatar-wrapper">
          {perfilData.avatarUrl ? (
            <img src={perfilData.avatarUrl} alt={perfilData.nomeExibicao} className="perfil-avatar" referrerPolicy="no-referrer" />
          ) : (
            <div className="perfil-avatar avatar-vazio"><span>{(perfilData.nomeExibicao || perfilData.login || 'H')[0].toUpperCase()}</span></div>
          )}
          
          {isOwner && editandoMidia && (
            <label className="avatar-upload-badge" title="Alterar foto">
              ✎ <input type="file" accept="image/*" onChange={(e) => onFileChange(e, 'avatarUrl')} hidden />
            </label>
          )}
        </div>

        <div className="perfil-identidade">
          <span className="perfil-stat">Seguindo <strong>{perfilData.seguindo?.length || 0}</strong></span>
          <div className="perfil-nomes">
            {isOwner && editandoIdentidade ? (
              <div className="identidade-editor-box">
                <input type="text" placeholder="Nome" value={loggedUser.nomeExibicao} onChange={(e) => setLoggedUser({...loggedUser, nomeExibicao: e.target.value})} maxLength={30} />
                <div className="input-arroba">
                  <span>@</span>
                  <input type="text" placeholder="username" value={loggedUser.username} onChange={(e) => setLoggedUser({...loggedUser, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')})} maxLength={20} />
                </div>
                <div className="editor-actions center-actions">
                  <button className="btn-salvar" onClick={() => salvarNoBanco({nomeExibicao: loggedUser.nomeExibicao, username: loggedUser.username})} disabled={salvando}>Salvar</button>
                  <button className="btn-cancelar" onClick={() => setEditandoIdentidade(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <h2>
                  {perfilData.nomeExibicao || 'Novo Desenvolvedor'}
                  {isOwner && <button className="btn-edit-inline" onClick={() => setEditandoIdentidade(true)}>✎</button>}
                </h2>
                <p>@{perfilData.username || perfilData.login.split('@')[0]}</p>
              </>
            )}
          </div>
          <span className="perfil-stat"><strong>{perfilData.seguidores?.length || 0}</strong> Seguidores</span>
        </div>

        {/* EDITOR DE MÍDIA FICA IGUAL... */}
        {isOwner && editandoMidia && (
          <div className="midia-editor-box">
             {/* Conteúdo mantido idêntico */}
            <h4>Atualizar Capa do Perfil</h4>
            <div className="midia-input-group">
              <label>Escolher nova imagem:</label>
              <label className="custom-file-upload">
                <input type="file" accept="image/*" onChange={(e) => onFileChange(e, 'bannerUrl')} hidden />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                Fazer upload
              </label>
            </div>
            <div className="midia-input-group" style={{marginTop: '10px'}}>
              <input type="text" placeholder="Ou link de imagem (https://...)" value={loggedUser.bannerUrl} onChange={(e) => setLoggedUser({ ...loggedUser, bannerUrl: e.target.value })} />
            </div>
            <div className="editor-actions midia-actions">
              <button className="btn-cancelar" onClick={() => setEditandoMidia(false)}>Fechar</button>
              <button className="btn-salvar" onClick={() => salvarNoBanco({ bannerUrl: loggedUser.bannerUrl })} disabled={salvando}>Salvar</button>
            </div>
          </div>
        )}
      </div>

      <div className="perfil-content-grid">
        <div className="perfil-col-esquerda">
          <div className="perfil-top-cards">
            
            <div className="huby-card-wrapper">
              <div className="huby-card-header">
                <span className="huby-pill-tag">Biografia</span>
                {isOwner && <button className="huby-edit-btn" onClick={() => setEditandoBio(!editandoBio)}>✎</button>}
              </div>
              <div className="huby-card-body">
                {isOwner && editandoBio ? (
                  <div className="card-editor">
                    <textarea rows={4} value={loggedUser.bio} onChange={(e) => setLoggedUser({ ...loggedUser, bio: e.target.value })} />
                    <div className="editor-actions">
                      <button className="btn-salvar" onClick={() => salvarNoBanco({ bio: loggedUser.bio })}>Salvar</button>
                      <button className="btn-cancelar" onClick={() => setEditandoBio(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <p className={perfilData.bio ? 'bio-text' : 'texto-vazio'}>
                    {perfilData.bio || (isOwner ? 'Sua biografia está vazia.' : 'Este usuário ainda não adicionou uma biografia.')}
                  </p>
                )}
              </div>
            </div>

            <div className="huby-card-wrapper">
              <div className="huby-card-header">
                <span className="huby-pill-tag">Informações Gerais</span>
                {isOwner && <button className="huby-edit-btn" onClick={() => setEditandoRedes(!editandoRedes)}>✎</button>}
              </div>
              <div className="huby-card-body">
                {isOwner && editandoRedes ? (
                  <div className="redes-editor-grid">
                    <input type="text" placeholder="Instagram" value={loggedUser.instagram} onChange={(e) => setLoggedUser({ ...loggedUser, instagram: e.target.value })} />
                    <input type="text" placeholder="Discord" value={loggedUser.discord} onChange={(e) => setLoggedUser({ ...loggedUser, discord: e.target.value })} />
                    <input type="text" placeholder="Twitter" value={loggedUser.twitter} onChange={(e) => setLoggedUser({ ...loggedUser, twitter: e.target.value })} />
                    <input type="text" placeholder="TikTok" value={loggedUser.tiktok} onChange={(e) => setLoggedUser({ ...loggedUser, tiktok: e.target.value })} />
                    <input type="text" placeholder="Steam" value={loggedUser.steam} onChange={(e) => setLoggedUser({ ...loggedUser, steam: e.target.value })} />
                    <input type="text" placeholder="Itch.io" value={loggedUser.itchIo} onChange={(e) => setLoggedUser({ ...loggedUser, itchIo: e.target.value })} />
                    <div className="editor-actions full-span">
                      <button className="btn-salvar" onClick={() => salvarNoBanco(loggedUser)}>Salvar</button>
                      <button className="btn-cancelar" onClick={() => setEditandoRedes(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="redes-grid">
                    <div className="rede-item"><svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/></svg> <span className={perfilData.instagram ? '' : 'rede-vazia'}>{perfilData.instagram || '...'}</span></div>
                    <div className="rede-item"><svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> <span className={perfilData.discord ? '' : 'rede-vazia'}>{perfilData.discord || '...'}</span></div>
                    <div className="rede-item"><svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83z"/></svg> <span className={perfilData.twitter ? '' : 'rede-vazia'}>{perfilData.twitter || '...'}</span></div>
                    <div className="rede-item"><svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg> <span className={perfilData.tiktok ? '' : 'rede-vazia'}>{perfilData.tiktok || '...'}</span></div>
                    <div className="rede-item"><svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg> <span className={perfilData.steam ? '' : 'rede-vazia'}>{perfilData.steam || '...'}</span></div>
                    <div className="rede-item"><svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m7-1h.01"/></svg> <span className={perfilData.itchIo ? '' : 'rede-vazia'}>{perfilData.itchIo || '...'}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="perfil-bottom-cards">
            {/* Mantém igual */}
            <div className="huby-card-wrapper">
              <div className="huby-card-header"><span className="huby-pill-tag">Comentários</span></div>
              <div className="huby-card-body lista-interacoes"><div className="empty-state-box"><p>Nenhum comentário realizado.</p></div></div>
            </div>
            <div className="huby-card-wrapper">
              <div className="huby-card-header"><span className="huby-pill-tag">Avaliações</span></div>
              <div className="huby-card-body lista-interacoes"><div className="empty-state-box"><p>Nenhuma análise publicada.</p></div></div>
            </div>
          </div>
        </div>

        <div className="perfil-col-direita">
          <div className="huby-card-wrapper full-height-card">
            <div className="huby-tabs-header">
              <button className={`huby-tab-btn ${abaAtiva === 'publicados' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('publicados')}>Publicados <span>(0)</span></button>
              <button className={`huby-tab-btn ${abaAtiva === 'criados' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('criados')}>Criados <span>(0)</span></button>
              <button className={`huby-tab-btn ${abaAtiva === 'participados' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('participados')}>Participados <span>(0)</span></button>
            </div>
            <div className="huby-card-body galeria-jogos-body">
              <div className="empty-publications">
                <h3>Nenhum projeto em "{abaAtiva}"</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default Perfil;