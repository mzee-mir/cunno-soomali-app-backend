import { Router } from 'express'
import authentications from '../middleware/authentications'
import addressController from '../controllers/addressController'

const addressRouter = Router()

addressRouter.post('/create-address',authentications,addressController.addAddressController)
addressRouter.get("/get-address",authentications,addressController.getAddressController)
addressRouter.put('/update-address',authentications,addressController.updateAddressController)
addressRouter.delete("/disable-address",authentications,addressController.deleteAddresscontroller)

export default addressRouter