import {AbstractPaymentProvider, BigNumber, MedusaError} from "@medusajs/framework/utils";
import {
    Logger,
    PaymentProviderSessionResponse,
    PaymentSessionStatus,
    PaymentProviderError,
    CreatePaymentProviderSession,
    WebhookActionResult,
    UpdatePaymentProviderSession,
} from "@medusajs/framework/types";
import {BigNumberInput, ProviderWebhookPayload, UpdatePaymentInput} from "@medusajs/types";
import {Fixer} from "../../modules/mercury/lib/fixer";
import {Pricefeeder} from "../../modules/mercury/lib/pricefeeder";

const baseUrl = process.env.VITE_BACKEND_URL;

type Options = {
    fixerApiKey?: string;
    currencyFreaksApiKey?: string;
    apiKey: string
}

type InjectedDependencies = {
    logger: Logger
}

class MercuryProviderService extends AbstractPaymentProvider<Options> {
    protected logger_: Logger
    public options_: Options

    static identifier = "cardano-mercury"
    static displayName = "Cardano Mercury"
    static title = "Cardano Mercury"

    constructor(
        container: InjectedDependencies,
        options: Options
    ) {
        console.log("✅ Cardano Mercury Payment Provider initialized!");

        super(container, options)

        this.logger_ = container.logger;
        this.options_ = options;

    }

    static validateOptions(options: Record<any, any>) {
        if (!options.apiKey) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "API key is required in the provider's options."
            )
        }

        // TODO: Add more granular error checking of options here
    }

    async capturePayment(paymentData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        this.logger_.debug("Capturing payment!");
        this.logger_.debug(JSON.stringify(paymentData));

        return {
            data: paymentData.data,
            status: "captured"
        }
    }

    async authorizePayment(paymentSessionData: Record<string, unknown>, context: Record<string, unknown>): Promise<PaymentProviderError | {
        status: PaymentSessionStatus
        data: PaymentProviderSessionResponse["data"]
    }> {
        this.logger_.debug("Authorizing payment!");
        this.logger_.debug(JSON.stringify(paymentSessionData));

        return {
            data: {
                transaction_hash: paymentSessionData["data"]?.["transaction_hash"], // Access fields from the payment-session data object provided when payment-session was initiated or updated.
            },
            status: "authorized"
        }
    }

    async cancelPayment(paymentData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        this.logger_.debug("Cancel payment!");
        this.logger_.debug(JSON.stringify(paymentData));

        return {
            id: paymentData.id
        }
    }

    async initiatePayment(context: CreatePaymentProviderSession): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
        const {
            amount,
            currency_code,
            context: customerDetails
        } = context

        const rate_response = await fetch(`${baseUrl}/mercury/rate`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: currency_code.toUpperCase(),
                to: "USD",
                amount,
            })
        });
        const rate_details = await rate_response.json();

        const response = await fetch(`${baseUrl}/mercury/address`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                order_id: customerDetails.session_id,
            })
        });
        const payment_address = await response.json();

        return {
            data: {
                ...rate_details,
                customerDetails,
                address: payment_address.bech32,
            }
        }
    }

    async deletePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        this.logger_.debug("Delete payment!");
        this.logger_.debug(JSON.stringify(paymentSessionData));

        return {
            paymentSessionData
        }
    }

    async getPaymentStatus(paymentSessionData: Record<string, unknown>): Promise<PaymentSessionStatus> {
        this.logger_.debug("Getting payment status!");
        this.logger_.debug(JSON.stringify(paymentSessionData));

        return "pending";
    }

    async refundPayment(paymentData: Record<string, unknown>, refundAmount: BigNumberInput): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
        this.logger_.debug("Refund payment!");
        this.logger_.debug(JSON.stringify(paymentData));

        return {
            data: {
                id: paymentData.id,
            }
        }
    }

    async retrievePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        this.logger_.debug("Retrieve payment status!");
        this.logger_.debug(JSON.stringify(paymentSessionData));

        return {
            id: paymentSessionData.id,
        }
    }

    async updatePayment(context: UpdatePaymentProviderSession): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
        this.logger_.debug("Update payment!");
        this.logger_.debug(JSON.stringify(context));

        return {
            data: context.data // Return same data for now, instead of returning empty object which removes the data.
        }
    }

    async getWebhookActionAndData(data: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
        return {
            action: "authorized",
            data: {
                session_id: (data.data.metadata as Record<string, any>).session_id,
                amount: new BigNumber(data.data.amount as number)
            }
        }
    }


}

export default MercuryProviderService