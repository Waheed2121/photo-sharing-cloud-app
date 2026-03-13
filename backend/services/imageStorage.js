const fs = require("fs/promises")
const path = require("path")

function localImageUrl(filename) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3000"
    return `${backendUrl}/uploads/${filename}`
}

function isAzureConfigured() {
    return Boolean(
        process.env.AZURE_STORAGE_CONNECTION_STRING &&
        (process.env.BLOB_CONTAINER_NAME || process.env.AZURE_STORAGE_CONTAINER)
    )
}

async function uploadToAzure(file, userId) {
    // Load Azure SDK only when Azure storage is configured.
    const { BlobServiceClient } = require("@azure/storage-blob")
    const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
    )
    const containerName = process.env.BLOB_CONTAINER_NAME || process.env.AZURE_STORAGE_CONTAINER
    if (!containerName) {
        throw new Error("Missing required blob container variable: BLOB_CONTAINER_NAME")
    }
    const containerClient = blobServiceClient.getContainerClient(
        containerName
    )
    await containerClient.createIfNotExists()

    const ext = path.extname(file.originalname || "").toLowerCase()
    const safeUserId = userId ? String(userId) : "anonymous"
    // Required structure: photos/userId/photoId.jpg (container: photos).
    const blobName = `${safeUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    const fileBuffer = await fs.readFile(file.path)

    await blockBlobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype }
    })
    await fs.unlink(file.path)
    return blockBlobClient.url
}

exports.resolveImageUrl = async (file, userId) => {
    if (!file) {
        throw new Error("No file provided")
    }
    if (isAzureConfigured()) {
        return uploadToAzure(file, userId)
    }
    return localImageUrl(file.filename)
}
