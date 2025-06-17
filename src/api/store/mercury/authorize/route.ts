import {MedusaRequest, MedusaResponse} from "@medusajs/framework/http";
import {authorizePaymentSessionStep, processPaymentWorkflow} from "@medusajs/medusa/core-flows"
import {ContainerRegistrationKeys} from "@medusajs/framework/utils";
import {Modules} from "@medusajs/framework/utils"

export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse,
) => {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)

    const {id, currency_code, amount, tx_hash} = req.body as {
        id: string
        currency_code: string
        amount: number
        tx_hash: string
    };

    if (!id || !tx_hash) {
        res.status(400).json({
            message: `Bad request`
        })
        return;
    }

    try {
        const result = await paymentModuleService.updatePaymentSession({
            id,
            currency_code,
            amount,
            data: {
                transaction_hash: tx_hash,
            }
        });

        const payment = await paymentModuleService.authorizePaymentSession(
            id,
            {} // The context can be empty since data is retrieved from the payment-session object.
        )

        // const payment = await processPaymentWorkflow(req.scope)
        //     .run({
        //         input: {
        //             action: "authorized",
        //             data: {
        //                 session_id: id,
        //                 amount: amount,
        //             }
        //         }
        //     })

        res.status(200).json({
            success: true,
            message: `Payment authorized`,
        })

    } catch (e) {
        logger.error(`Could not update the payment session: ${e.message}`);
        res.status(400).json({
            success: false,
            message: e.message
        })
    }
}