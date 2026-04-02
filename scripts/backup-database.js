#!/usr/bin/env node

/**
 * Script de sauvegarde automatique de la base de données MySQL
 * 
 * Ce script :
 * - Exporte la base de données MySQL en format SQL
 * - Sauvegarde le fichier dans un dossier dédié
 * - Nettoie les anciennes sauvegardes (garde les 30 derniers jours)
 * - Compresse les sauvegardes pour économiser l'espace
 * 
 * Usage:
 *   node scripts/backup-database.js
 * 
 * Configuration via variables d'environnement:
 *   DATABASE_URL - URL de connexion MySQL
 *   BACKUP_DIR - Dossier de sauvegarde (défaut: ./backups)
 *   KEEP_DAYS - Nombre de jours à conserver (défaut: 30)
 */

const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { createGzip } = require('zlib')
const { pipeline } = require('stream')
const { promisify } = require('util')

const pipelineAsync = promisify(pipeline)

// Configuration
const DATABASE_URL = process.env.DATABASE_URL
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const KEEP_DAYS = parseInt(process.env.KEEP_DAYS || '30', 10)

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString()
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`)
}

function error(message) {
  log(`❌ ERREUR: ${message}`, 'red')
}

function success(message) {
  log(`✅ ${message}`, 'green')
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan')
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

/**
 * Parse la DATABASE_URL pour extraire les informations de connexion
 */
function parseDatabaseUrl(url) {
  if (!url) {
    throw new Error('DATABASE_URL n\'est pas définie')
  }

  try {
    // Utiliser URL pour parser correctement, même avec des caractères spéciaux
    const urlObj = new URL(url)
    
    // Décoder les caractères encodés dans le mot de passe et l'utilisateur
    const user = decodeURIComponent(urlObj.username || '')
    const password = decodeURIComponent(urlObj.password || '')
    const host = urlObj.hostname || 'localhost'
    const port = urlObj.port || '3306'
    
    // Extraire le nom de la base de données (enlever le / initial)
    const database = urlObj.pathname ? urlObj.pathname.replace(/^\//, '').split('?')[0] : ''
    
    if (!user || !database) {
      throw new Error('Informations incomplètes dans DATABASE_URL')
    }

    return {
      user,
      password,
      host,
      port,
      database
    }
  } catch (err) {
    // Fallback sur regex pour les formats non standard
    // Format: mysql://user:password@host:port/database
    const match = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):?(\d*)\/(.+)$/)
    
    if (!match) {
      throw new Error(`Format de DATABASE_URL invalide: ${err.message}. Format attendu: mysql://user:password@host:port/database`)
    }

    return {
      user: decodeURIComponent(match[1]),
      password: decodeURIComponent(match[2]),
      host: match[3],
      port: match[4] || '3306',
      database: match[5].split('?')[0] // Enlever les query params si présents
    }
  }
}

/**
 * Crée le dossier de sauvegarde s'il n'existe pas
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    info(`Dossier de sauvegarde créé: ${BACKUP_DIR}`)
  }
}

/**
 * Génère le nom du fichier de sauvegarde
 */
function generateBackupFilename() {
  const now = new Date()
  const date = now.toISOString().split('T')[0] // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
  
  return `backup_${date}_${time}.sql.gz`
}

/**
 * Vérifie si mysqldump est disponible et retourne son chemin
 */
function checkMysqldump() {
  // 1. Essayer via le PATH courant
  try {
    execSync('which mysqldump', { stdio: 'ignore', shell: true })
    return true
  } catch {
    // Pas dans le PATH
  }

  // 2. Essayer les chemins courants (Linux / macOS Intel / macOS Apple Silicon)
  const commonPaths = [
    '/usr/bin/mysqldump',
    '/usr/local/bin/mysqldump',
    '/opt/homebrew/bin/mysqldump',
    '/opt/homebrew/opt/mysql-client/bin/mysqldump',
    '/usr/local/mysql/bin/mysqldump',
  ]
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      // Ajouter le dossier au PATH pour que la commande fonctionne ensuite
      const dir = path.dirname(p)
      process.env.PATH = `${dir}:${process.env.PATH}`
      return true
    }
  }

  return false
}

/**
 * Exécute la sauvegarde de la base de données.
 * Utilise spawnSync avec sortie directe vers fichier pour éviter tout
 * chargement en mémoire (pas de limite maxBuffer quelle que soit la taille de la BDD).
 */
async function backupDatabase(dbConfig) {
  const filename = generateBackupFilename()
  const filepath = path.join(BACKUP_DIR, filename)
  const tempFilepath = path.join(BACKUP_DIR, filename.replace('.gz', ''))
  const tempConfigFile = path.join(BACKUP_DIR, '.my.cnf.backup')

  info(`Début de la sauvegarde vers: ${filepath}`)

  let outFd = null

  try {
    // Fichier de configuration MySQL temporaire (évite le mot de passe en clair)
    const configContent = `[client]\nhost=${dbConfig.host}\nport=${dbConfig.port}\nuser=${dbConfig.user}\npassword=${dbConfig.password}\n`
    fs.writeFileSync(tempConfigFile, configContent, { mode: 0o600 })

    const args = [
      `--defaults-file=${tempConfigFile}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--events',
      '--quick',
      '--lock-tables=false',
      '--no-tablespaces',
      dbConfig.database,
    ]

    info('Export de la base de données en cours...')

    // Ouvrir le fichier de destination et y écrire stdout directement —
    // aucun passage en mémoire, fonctionne pour n'importe quelle taille de BDD.
    outFd = fs.openSync(tempFilepath, 'w')
    const result = spawnSync('mysqldump', args, {
      stdio: ['ignore', outFd, 'pipe'],
      env: { ...process.env },
    })
    fs.closeSync(outFd)
    outFd = null

    if (result.error || result.status !== 0) {
      const stderr = result.stderr ? result.stderr.toString().trim() : ''
      const errCode = result.error?.code

      if (errCode === 'ENOENT') {
        throw new Error('mysqldump introuvable. Installez mysql-client et vérifiez le PATH.')
      }
      if (stderr.includes('Access denied')) {
        throw new Error(`Accès refusé à la base de données. Vérifiez les identifiants dans DATABASE_URL.\nDétails: ${stderr}`)
      }
      if (stderr.includes('Unknown database')) {
        throw new Error(`Base de données '${dbConfig.database}' introuvable.\nDétails: ${stderr}`)
      }
      if (stderr.includes("Can't connect") || stderr.includes('Connection refused')) {
        throw new Error(`Impossible de se connecter à MySQL sur ${dbConfig.host}:${dbConfig.port}. Vérifiez que MySQL est démarré.\nDétails: ${stderr}`)
      }
      throw new Error(`mysqldump a échoué (code ${result.status}).\n${stderr}`)
    }

    // Compresser le fichier .sql → .sql.gz
    info('Compression de la sauvegarde...')
    const input = fs.createReadStream(tempFilepath)
    const output = fs.createWriteStream(filepath)
    const gzip = createGzip({ level: 9 })
    await pipelineAsync(input, gzip, output)

    fs.unlinkSync(tempFilepath)

    const stats = fs.statSync(filepath)
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
    success(`Sauvegarde créée avec succès: ${filename} (${sizeInMB} MB)`)
    return filepath

  } catch (err) {
    if (outFd !== null) { try { fs.closeSync(outFd) } catch {} }
    if (fs.existsSync(tempFilepath)) fs.unlinkSync(tempFilepath)
    throw err
  } finally {
    if (fs.existsSync(tempConfigFile)) fs.unlinkSync(tempConfigFile)
  }
}

/**
 * Nettoie les anciennes sauvegardes
 */
function cleanOldBackups() {
  info(`Nettoyage des sauvegardes de plus de ${KEEP_DAYS} jours...`)

  try {
    const files = fs.readdirSync(BACKUP_DIR)
    const now = Date.now()
    const keepTime = KEEP_DAYS * 24 * 60 * 60 * 1000 // En millisecondes

    let deletedCount = 0
    let totalSizeFreed = 0

    for (const file of files) {
      // Ne traiter que les fichiers de sauvegarde
      if (!file.startsWith('backup_') || !file.endsWith('.sql.gz')) {
        continue
      }

      const filepath = path.join(BACKUP_DIR, file)
      const stats = fs.statSync(filepath)
      const fileAge = now - stats.mtimeMs

      if (fileAge > keepTime) {
        totalSizeFreed += stats.size
        fs.unlinkSync(filepath)
        deletedCount++
        info(`Supprimé: ${file} (${(fileAge / (24 * 60 * 60 * 1000)).toFixed(1)} jours)`)
      }
    }

    if (deletedCount > 0) {
      const sizeInMB = (totalSizeFreed / (1024 * 1024)).toFixed(2)
      success(`${deletedCount} ancienne(s) sauvegarde(s) supprimée(s) (${sizeInMB} MB libérés)`)
    } else {
      info('Aucune ancienne sauvegarde à supprimer')
    }

  } catch (err) {
    warning(`Erreur lors du nettoyage: ${err.message}`)
  }
}

/**
 * Affiche un résumé des sauvegardes
 */
function showBackupSummary() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.sql.gz'))
      .map(f => {
        const filepath = path.join(BACKUP_DIR, f)
        const stats = fs.statSync(filepath)
        return {
          name: f,
          size: stats.size,
          date: stats.mtime
        }
      })
      .sort((a, b) => b.date - a.date) // Plus récent en premier

    if (files.length === 0) {
      info('Aucune sauvegarde trouvée')
      return
    }

    info(`\n📊 Résumé des sauvegardes (${files.length} fichier(s)):`)
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)
    
    console.log(`   Taille totale: ${totalSizeMB} MB\n`)
    
    // Afficher les 5 plus récentes
    files.slice(0, 5).forEach((file, index) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      const date = new Date(file.date).toLocaleString('fr-FR')
      console.log(`   ${index + 1}. ${file.name}`)
      console.log(`      ${date} - ${sizeMB} MB`)
    })

    if (files.length > 5) {
      console.log(`   ... et ${files.length - 5} autre(s) sauvegarde(s)`)
    }

  } catch (err) {
    warning(`Erreur lors de l'affichage du résumé: ${err.message}`)
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🗄️  SAUVEGARDE DE LA BASE DE DONNÉES')
  console.log('='.repeat(60) + '\n')

  try {
    // Vérifications préalables
    if (!checkMysqldump()) {
      throw new Error('mysqldump n\'est pas installé ou n\'est pas dans le PATH')
    }

    // Parse de la DATABASE_URL
    const dbConfig = parseDatabaseUrl(DATABASE_URL)
    info(`Connexion à la base: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`)
    info(`Utilisateur: ${dbConfig.user}`)
    // Ne pas afficher le mot de passe complet pour la sécurité
    if (dbConfig.password) {
      info(`Mot de passe: ${'*'.repeat(Math.min(dbConfig.password.length, 10))}`)
    }

    // Créer le dossier de sauvegarde
    ensureBackupDirectory()

    // Effectuer la sauvegarde
    await backupDatabase(dbConfig)

    // Nettoyer les anciennes sauvegardes
    cleanOldBackups()

    // Afficher le résumé
    showBackupSummary()

    success('\n✨ Sauvegarde terminée avec succès!\n')

  } catch (err) {
    error(`\n${err.message}\n`)
    if (err.stderr) {
      console.error(err.stderr.toString())
    }
    process.exit(1)
  }
}

// Exécution
if (require.main === module) {
  main()
}

module.exports = { main, parseDatabaseUrl, generateBackupFilename }

